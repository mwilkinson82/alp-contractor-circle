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
  ArrowRight,
  BookOpen,
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
  AlertTriangle,
  RefreshCw,
  ClipboardCheck,
  Send,
  Database,
  FileCheck2,
  ShieldCheck,
  Users,
  Percent,
} from "lucide-react";

// ─── Design Tokens ──────────────────────────────────────────────────────────

const COLORS = {
  bg: "#FAF8F5", // warm cream
  bgSubtle: "#F3F0EB", // slightly deeper cream
  bgCard: "#FFFFFF", // white card surfaces
  text: "#2C2825", // warm charcoal
  textMuted: "#8A8279", // muted warm gray
  textLight: "#B5AEA4", // light warm gray
  accent: "#B8865C", // copper/bronze accent
  accentLight: "#D4A574", // lighter copper
  accentGlow: "rgba(184, 134, 92, 0.25)",
  success: "#5B8A72", // sage green
  successLight: "rgba(91, 138, 114, 0.15)",
  active: "#B8865C", // copper for active states
  activeLight: "rgba(184, 134, 92, 0.12)",
  error: "#C4645A", // muted red
  pending: "#E8E3DC", // light warm gray for pending
  border: "#E8E3DC", // warm border
  borderAccent: "rgba(184, 134, 92, 0.3)",
};

// ─── Status Messages ──────────────────────────────────────────────────────────

const PHASE1_MESSAGES = [
  { icon: ScanLine, text: "Scanning drawings — classifying sheet types..." },
  {
    icon: FileSearch,
    text: "Identifying plan views, sections, and details...",
  },
  { icon: Layers, text: "Detecting cover sheets and schedules..." },
  { icon: Ruler, text: "Preparing sheets for extraction..." },
];

const PHASE2_MESSAGES = [
  { icon: HardHat, text: "Reading the drawing holistically..." },
  { icon: Boxes, text: "Extracting measurable quantities..." },
  { icon: Calculator, text: "Classifying items by CSI division..." },
  { icon: ScanLine, text: "Applying scope-aware extraction..." },
  { icon: Hammer, text: "Preparing rows for pricing and review..." },
];

type AnalysisPhase = "indexing" | "extracting" | "consolidating";

const PHASE3_MESSAGES = [
  { icon: Layers, text: "Consolidating duplicate items across all sheets..." },
  { icon: Calculator, text: "Converting lump sums to measured quantities..." },
  { icon: Ruler, text: "Calculating formwork (SFCA)..." },
  { icon: Wrench, text: "Enhancing rebar quantities..." },
  { icon: DollarSign, text: "Applying material and labor pricing..." },
  { icon: ScanLine, text: "Applying regional cost multiplier..." },
];

const PHASE_DETAILS = {
  indexing: {
    eyebrow: "Pass 1",
    title: "Building the drawing index",
    summary:
      "ConstructLine is sorting the set before takeoff so each sheet gets the right role in the bid.",
    valueCards: [
      {
        icon: FileSearch,
        title: "Sheet classification",
        body: "Plans, schedules, details, covers, and notes are separated so high-value sheets move first.",
      },
      {
        icon: Layers,
        title: "Drawing review",
        body: "The set is scanned for context that affects scope, sequencing, and trade boundaries.",
      },
      {
        icon: ShieldCheck,
        title: "Bid guardrails",
        body: "Context-only sheets stay useful without inflating quantities or active totals.",
      },
    ],
    nudges: [
      "Confirm the bid mode matches the package you plan to price.",
      "After indexing, review sheet roles before chasing quantities.",
    ],
  },
  extracting: {
    eyebrow: "Pass 2",
    title: "Extracting measurable scope",
    summary:
      "Rows are being created with the evidence needed to review, accept, or hold scope decisions.",
    valueCards: [
      {
        icon: ScanLine,
        title: "Source evidence",
        body: "Quantities are tied back to drawing context so decisions can be checked later.",
      },
      {
        icon: ClipboardCheck,
        title: "Review rows",
        body: "Ambiguous or boundary work is preserved for review instead of silently entering the bid.",
      },
      {
        icon: AlertTriangle,
        title: "Anomaly traceability",
        body: "Potential source issues and unusual quantities stay visible for faster cleanup.",
      },
    ],
    nudges: [
      "Use Review to decide what belongs in the active bid.",
      "Open source evidence before including uncertain rows.",
    ],
  },
  consolidating: {
    eyebrow: "Pass 3",
    title: "Turning takeoff into bid output",
    summary:
      "Accepted scope is being grouped, priced, and prepared for the Estimate and Submit workflow.",
    valueCards: [
      {
        icon: Database,
        title: "Cost library",
        body: "Material unit costs are matched and organized by CSI-friendly bid structure.",
      },
      {
        icon: HardHat,
        title: "Trade rates & crews",
        body: "Labor pricing uses your trade rate library, crew assumptions, and regional setup.",
      },
      {
        icon: Percent,
        title: "Markups & bid output",
        body: "Pricing rolls toward a package-ready estimate with bid summary and SOV outputs.",
      },
    ],
    nudges: [
      "Estimate is where you decide what accepted work costs.",
      "Submit packages the finished bid after review and pricing are clean.",
    ],
  },
} satisfies Record<
  AnalysisPhase,
  {
    eyebrow: string;
    title: string;
    summary: string;
    valueCards: Array<{ icon: any; title: string; body: string }>;
    nudges: string[];
  }
>;

const NEXT_STEPS = [
  {
    label: "Review",
    detail: "Decide what belongs",
    icon: ClipboardCheck,
    color: "border-[#d7b44d] bg-[#fff4cb] text-[#8a6510]",
  },
  {
    label: "Estimate",
    detail: "Decide what it costs",
    icon: Calculator,
    color: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  {
    label: "Submit",
    detail: "Package the bid",
    icon: Send,
    color: "border-violet-200 bg-violet-50 text-violet-800",
  },
];

const EDUCATION_CARDS = [
  {
    title: "After indexing, you can navigate away",
    body: "ConstructLine keeps extracting in the background. Come back when the badge moves to Estimate or when you are ready to review the bid.",
  },
  {
    title: "Review before pricing",
    body: "Review is where you decide what belongs in the active bid. Boundary rows stay visible but out of the total until you include them.",
  },
  {
    title: "Use source evidence for judgment calls",
    body: "When a row feels unusual, open the drawing context before accepting it. The goal is a clean bid, not a blind spreadsheet.",
  },
  {
    title: "Estimate is the pricing room",
    body: "Once scope is accepted, Estimate is where labor basis, cost library values, markups, tax, and bid total come together.",
  },
  {
    title: "Submit is the finish line",
    body: "When the estimate is ready, package it into a proposal, bid summary, and SOV with your company assets attached.",
  },
];

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
  onRetrySheet?: (sheetId: number) => void;
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
  const strokeColor =
    phase === "consolidating" ? COLORS.success : COLORS.accent;
  const glowColor =
    phase === "consolidating" ? "rgba(91, 138, 114, 0.3)" : COLORS.accentGlow;
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
        {[0, 1, 2].map(i => (
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
  onRetrySheet,
}: ProcessingOverlayProps) {
  const [showSplash, setShowSplash] = useState(true);
  const [messageIndex, setMessageIndex] = useState(0);
  const [educationIndex, setEducationIndex] = useState(0);
  const phaseStartRef = useRef(Date.now());
  const [phaseElapsed, setPhaseElapsed] = useState(0);
  const consolidationStartRef = useRef<number | null>(null);
  const [consolidationElapsed, setConsolidationElapsed] = useState(0);
  const extractionStartProcessedRef = useRef(processedSheets);

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
        setConsolidationElapsed(
          Date.now() - (consolidationStartRef.current || Date.now())
        );
      }, 1000);
      return () => clearInterval(interval);
    } else {
      consolidationStartRef.current = null;
      setConsolidationElapsed(0);
    }
  }, [currentPhase]);

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

  useEffect(() => {
    const interval = setInterval(() => {
      setPhaseElapsed(Date.now() - phaseStartRef.current);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    phaseStartRef.current = Date.now();
    extractionStartProcessedRef.current = processedSheets;
    setPhaseElapsed(0);
    setMessageIndex(0);
    setEducationIndex(0);
  }, [currentPhase]);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % phaseMessages.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [phaseMessages]);

  useEffect(() => {
    const interval = setInterval(() => {
      setEducationIndex(prev => (prev + 1) % EDUCATION_CARDS.length);
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  const percentage =
    totalSheets > 0 ? Math.round((processedSheets / totalSheets) * 100) : 0;
  const currentMessage = phaseMessages[messageIndex % phaseMessages.length];
  const CurrentIcon = currentMessage.icon;

  const currentSheet = useMemo(() => {
    if (!sheets) return null;
    return sheets.find(s => s.status === "processing");
  }, [sheets]);

  // Error sheets detection
  const errorSheets = useMemo(() => {
    if (!sheets) return [];
    return sheets.filter(s => s.status === "error");
  }, [sheets]);

  const CONSOLIDATION_ESTIMATE_MS = 180000;
  const DEFAULT_EXTRACTION_MS_PER_SHEET = 25000;

  const etaMs = useMemo(() => {
    if (currentPhase === "indexing") return 0; // No timer during indexing
    if (currentPhase === "consolidating") {
      // Never let it hit zero — show at least 15s while still in this phase
      return Math.max(15000, CONSOLIDATION_ESTIMATE_MS - consolidationElapsed);
    }
    const remaining = totalSheets - processedSheets;
    if (remaining <= 0) return 15000; // Almost done — show minimal time
    const processedSincePhaseStart = Math.max(
      0,
      processedSheets - extractionStartProcessedRef.current
    );
    const observedMsPerSheet =
      processedSincePhaseStart > 0 && phaseElapsed > 10000
        ? phaseElapsed / processedSincePhaseStart
        : DEFAULT_EXTRACTION_MS_PER_SHEET;
    const blendedMsPerSheet = Math.max(
      15000,
      Math.round((observedMsPerSheet + DEFAULT_EXTRACTION_MS_PER_SHEET) / 2)
    );
    return Math.max(30000, remaining * blendedMsPerSheet);
  }, [
    currentPhase,
    totalSheets,
    processedSheets,
    phaseElapsed,
    consolidationElapsed,
  ]);

  const phases = [
    {
      key: "indexing" as const,
      label: "Classify Sheets",
      description: "Identifying sheet types",
    },
    {
      key: "extracting" as const,
      label: "Extract",
      description: "ConstructLine extraction",
    },
    {
      key: "consolidating" as const,
      label: "Price & Consolidate",
      description: "Material + labor pricing",
    },
  ];

  const phaseOrder: AnalysisPhase[] = [
    "indexing",
    "extracting",
    "consolidating",
  ];
  const currentPhaseIndex = phaseOrder.indexOf(currentPhase);
  const phaseDetail = PHASE_DETAILS[currentPhase];
  const educationCard =
    EDUCATION_CARDS[educationIndex % EDUCATION_CARDS.length];
  const canNavigateAway = currentPhase !== "indexing";

  const isIndeterminate = currentPhase === "indexing";
  const consolidationPercentage =
    currentPhase === "consolidating"
      ? Math.min(
          99,
          Math.round((consolidationElapsed / CONSOLIDATION_ESTIMATE_MS) * 100)
        )
      : 0;
  const displayPercentage =
    currentPhase === "consolidating" ? consolidationPercentage : percentage;

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
      className="overflow-hidden rounded-xl"
      style={{
        border: "1px solid #e4d7bf",
        background: "#07090b",
        boxShadow: "0 22px 70px rgba(41, 37, 28, 0.10)",
        animation: "cl-splash-fade-in 0.6s ease-out",
      }}
    >
      <div
        className="h-1 bg-[linear-gradient(90deg,#d7b44d,#f1b51d,#d7b44d)] bg-[length:200%_100%]"
        style={{ animation: "shimmer 2s ease-in-out infinite" }}
      />

      <div className="grid bg-[#07090b] text-white lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="border-b border-white/10 px-6 py-7 sm:px-8 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#f1b51d]/30 bg-[#f1b51d]/10 text-[#f1b51d]">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-semibold leading-none">
                Construct<span className="text-[#f1b51d]">Line</span>
              </p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
                Processing Bid
              </p>
            </div>
          </div>
          <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.20em] text-[#f1b51d]">
            {phaseDetail.eyebrow}
          </p>
          <h3 className="mt-3 text-2xl font-semibold leading-tight tracking-normal">
            {phaseDetail.title}
          </h3>
          <p className="mt-3 text-sm leading-6 text-white/62">
            {phaseDetail.summary}
          </p>
        </div>

        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[230px_minmax(0,1fr)] lg:items-center">
          <div className="flex flex-col items-center">
            <div className="relative">
              <ProgressRing
                percentage={displayPercentage}
                isIndeterminate={isIndeterminate}
                phase={currentPhase}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {isIndeterminate ? (
                  <>
                    <CurrentIcon
                      className="mb-1 h-8 w-8"
                      style={{
                        color: COLORS.accentLight,
                        animation: "cl-icon-pulse 2s ease-in-out infinite",
                      }}
                    />
                    <span className="text-[11px] font-medium text-white/58">
                      Indexing
                    </span>
                  </>
                ) : currentPhase === "consolidating" ? (
                  <>
                    <CurrentIcon
                      className="mb-1 h-8 w-8"
                      style={{
                        color: "#7fd1a2",
                        animation: "cl-icon-pulse 2s ease-in-out infinite",
                      }}
                    />
                    <span className="text-[11px] font-medium text-white/58">
                      Finalizing
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-4xl font-bold leading-none tracking-normal text-white sm:text-5xl">
                      {formatTime(etaMs)}
                    </span>
                    <span className="mt-1.5 text-[11px] font-medium text-white/58">
                      remaining
                    </span>
                  </>
                )}
              </div>
            </div>
            {!isIndeterminate && (
              <span className="mt-5 text-sm font-semibold text-[#f1b51d]">
                {displayPercentage}% complete
              </span>
            )}
          </div>

          <div className="min-w-0">
            <div className="grid gap-3 sm:grid-cols-3">
              {phaseDetail.valueCards.map(card => {
                const CardIcon = card.icon;
                return (
                  <div
                    key={card.title}
                    className="rounded-lg border border-white/10 bg-white/[0.04] p-4"
                  >
                    <CardIcon className="h-4 w-4 text-[#f1b51d]" />
                    <p className="mt-3 text-sm font-semibold text-white">
                      {card.title}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-white/58">
                      {card.body}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_300px]">
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="h-4 w-4 text-[#f1b51d]" />
                  <p className="text-sm font-semibold text-white">
                    Setup nudges
                  </p>
                </div>
                <div className="mt-3 space-y-2">
                  {phaseDetail.nudges.map(nudge => (
                    <div
                      key={nudge}
                      className="flex gap-2 text-xs leading-5 text-white/64"
                    >
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
                      <span>{nudge}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-[#f1b51d]/25 bg-[#f1b51d]/10 p-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#f1b51d]" />
                  <p className="text-sm font-semibold text-white">Next steps</p>
                </div>
                <div className="mt-3 space-y-2">
                  {NEXT_STEPS.map((step, index) => {
                    const StepIcon = step.icon;
                    return (
                      <div key={step.label} className="flex items-center gap-2">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-lg border ${step.color}`}
                        >
                          <StepIcon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-white">
                            {step.label}
                          </p>
                          <p className="text-[11px] text-white/52">
                            {step.detail}
                          </p>
                        </div>
                        {index < NEXT_STEPS.length - 1 && (
                          <ArrowRight className="h-3.5 w-3.5 text-white/35" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 bg-[#07090b] px-6 py-7 text-white sm:px-10">
        <div
          className={`mx-auto mb-7 max-w-4xl rounded-xl border p-4 ${
            canNavigateAway
              ? "border-emerald-400/30 bg-emerald-400/10"
              : "border-[#f1b51d]/25 bg-[#f1b51d]/10"
          }`}
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                  canNavigateAway
                    ? "border-emerald-300/40 text-emerald-200"
                    : "border-[#f1b51d]/35 text-[#f1b51d]"
                }`}
              >
                <BookOpen className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  {canNavigateAway
                    ? "Indexing is complete. You can navigate away."
                    : "Stay here while ConstructLine indexes the drawing set."}
                </p>
                <p className="mt-1 text-xs leading-5 text-white/58">
                  {canNavigateAway
                    ? "Extraction continues in the background. Come back when you are ready to review scope and build the estimate."
                    : "Once the set is indexed, the page can keep working while you move elsewhere in ConstructLine."}
                </p>
              </div>
            </div>
            <div className="min-w-0 rounded-lg border border-white/10 bg-black/24 px-3 py-2 md:w-[320px]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#f1b51d]">
                Estimating note
              </p>
              <p className="mt-1 text-xs font-semibold text-white">
                {educationCard.title}
              </p>
              <p className="mt-1 text-[11px] leading-5 text-white/55">
                {educationCard.body}
              </p>
            </div>
          </div>
        </div>

        {/* ─── 3-Step Phase Progress ─────────────────────────────────── */}
        <div className="max-w-lg mx-auto mb-8">
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
                      className="absolute top-4 right-1/2 w-full h-px -z-10"
                      style={{
                        backgroundColor:
                          isComplete || isActive
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
                      <CheckCircle2
                        className="w-4 h-4"
                        style={{ color: COLORS.success }}
                      />
                    ) : isActive ? (
                      <Loader2
                        className="w-4 h-4 animate-spin"
                        style={{ color: COLORS.accent }}
                      />
                    ) : (
                      <Circle
                        className="w-3 h-3"
                        style={{ color: COLORS.textLight }}
                      />
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
        <div className="flex items-center justify-center gap-2.5 mb-8 h-5">
          <CurrentIcon
            className="w-4 h-4 shrink-0"
            style={{ color: `${COLORS.accent}B3` }}
          />
          <p className="text-sm font-medium text-white/76 transition-opacity">
            {currentMessage.text}
          </p>
        </div>

        {/* Sheet progress bar (extraction phase only) */}
        {currentPhase === "extracting" && (
          <div className="max-w-md mx-auto mb-6">
            <div className="flex items-center justify-between mb-2">
              <span
                className="text-xs font-medium"
                style={{ color: "rgba(255,255,255,0.55)" }}
              >
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
              Analyzing:{" "}
              {currentSheet.sheetName || `Page ${currentSheet.pageNumber}`}
            </Badge>
          </div>
        )}

        {/* ─── Error Alert Banner ──────────────────────────────────── */}
        {currentPhase === "extracting" && errorSheets.length > 0 && (
          <div
            className="max-w-md mx-auto mb-5 rounded-lg px-4 py-3 flex items-center gap-3"
            style={{
              backgroundColor: "rgba(196, 100, 90, 0.08)",
              border: `1px solid rgba(196, 100, 90, 0.25)`,
            }}
          >
            <AlertTriangle
              className="w-5 h-5 shrink-0"
              style={{ color: COLORS.error }}
            />
            <div className="flex-1 min-w-0">
              <p
                className="text-xs font-semibold"
                style={{ color: COLORS.error }}
              >
                {errorSheets.length} sheet{errorSheets.length > 1 ? "s" : ""}{" "}
                failed — tap to retry now
              </p>
              <p
                className="text-[10px] mt-0.5"
                style={{ color: COLORS.textMuted }}
              >
                {errorSheets
                  .map(s => s.sheetName || `Page ${s.pageNumber}`)
                  .join(", ")}
              </p>
            </div>
            {onRetrySheet && (
              <button
                onClick={() => errorSheets.forEach(s => onRetrySheet(s.id))}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold"
                style={{
                  backgroundColor: COLORS.error,
                  color: "#FFFFFF",
                  transition: "opacity 0.2s",
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
              >
                <RefreshCw className="w-3 h-3" />
                Retry All
              </button>
            )}
          </div>
        )}
        {/* Sheet Status Grid — during extraction, max 60 sheets */}
        {currentPhase === "extracting" &&
          sheets &&
          sheets.length > 0 &&
          sheets.length <= 60 && (
            <div className="flex flex-wrap justify-center gap-1.5 max-w-lg mx-auto mb-5">
              {sheets.map(sheet => {
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
                        ? {
                            animation:
                              "cl-segment-pulse 1.5s ease-in-out infinite",
                          }
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
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : isProcessing ? (
                      <div
                        className="w-2.5 h-2.5 rounded-full animate-spin"
                        style={{
                          border: `2px solid ${COLORS.accent}`,
                          borderTopColor: "transparent",
                        }}
                      />
                    ) : isError && onRetrySheet ? (
                      <button
                        onClick={() => onRetrySheet(sheet.id)}
                        className="w-full h-full flex items-center justify-center"
                        title={`Retry ${sheet.sheetName || `Page ${sheet.pageNumber}`}`}
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    ) : (
                      sheet.pageNumber
                    )}
                  </div>
                );
              })}
            </div>
          )}

        {/* Tip */}
        <p className="mt-5 text-center text-[11px] text-white/35">
          Processing keeps running on the server even if you leave this screen.
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
