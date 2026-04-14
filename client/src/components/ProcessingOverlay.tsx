/**
 * ProcessingOverlay — Animated construction-themed overlay shown during
 * Construct Line analysis. Features:
 * - Animated blueprint/construction visual
 * - Rotating status messages that cycle through analysis phases
 * - Real sheet-by-sheet progress bar
 * - Sheet name display as each one is processed
 */
import { useState, useEffect, useMemo } from "react";
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
} from "lucide-react";

// ─── Status Messages ──────────────────────────────────────────────────────────

const ANALYSIS_PHASES = [
  { icon: ScanLine, text: "Scanning drawing for construction elements..." },
  { icon: FileSearch, text: "Identifying plan details and annotations..." },
  { icon: Layers, text: "Detecting layers and building systems..." },
  { icon: Ruler, text: "Measuring quantities and dimensions..." },
  { icon: Boxes, text: "Classifying materials by CSI division..." },
  { icon: Calculator, text: "Calculating material quantities..." },
  { icon: HardHat, text: "Cross-referencing with industry standards..." },
  { icon: Hammer, text: "Matching items to unit cost database..." },
  { icon: Wrench, text: "Applying regional cost adjustments..." },
  { icon: DollarSign, text: "Finalizing cost estimates..." },
];

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
}

export default function ProcessingOverlay({
  totalSheets,
  processedSheets,
  sheets,
}: ProcessingOverlayProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [dotCount, setDotCount] = useState(1);

  // Rotate through status messages every 3.5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % ANALYSIS_PHASES.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  // Animate the dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((prev) => (prev % 3) + 1);
    }, 600);
    return () => clearInterval(interval);
  }, []);

  const percentage = totalSheets > 0
    ? Math.round((processedSheets / totalSheets) * 100)
    : 0;

  const currentPhase = ANALYSIS_PHASES[messageIndex];
  const CurrentIcon = currentPhase.icon;

  // Find the currently processing sheet
  const currentSheet = useMemo(() => {
    if (!sheets) return null;
    return sheets.find((s) => s.status === "processing");
  }, [sheets]);

  const dots = ".".repeat(dotCount);

  return (
    <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-b from-amber-500/5 via-navy-medium/40 to-navy-deep/60 overflow-hidden">
      {/* Top accent bar — animated gradient */}
      <div className="h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 bg-[length:200%_100%] animate-[shimmer_2s_ease-in-out_infinite]" />

      <div className="px-8 py-10">
        {/* Animated Icon Cluster */}
        <div className="flex justify-center mb-8">
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

        {/* Status Message — fades between phases */}
        <div className="text-center mb-8">
          <h3 className="text-lg font-semibold text-cream mb-2">
            Construct Line is Working
          </h3>
          <p className="text-amber-300/90 text-sm font-medium h-5 transition-all duration-300">
            {currentPhase.text}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="max-w-md mx-auto mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-cream-muted">
              Sheet {processedSheets} of {totalSheets}
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
              {/* Shine effect */}
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
                  animation: "shimmer 1.5s ease-in-out infinite",
                }}
              />
            </div>
          </div>
        </div>

        {/* Currently Processing Sheet */}
        {currentSheet && (
          <div className="text-center mb-6">
            <Badge className="bg-amber-500/10 text-amber-300 border-amber-500/20 text-xs px-3 py-1">
              Analyzing: {currentSheet.sheetName || `Page ${currentSheet.pageNumber}`}
            </Badge>
          </div>
        )}

        {/* Sheet Status Pills */}
        {sheets && sheets.length > 0 && sheets.length <= 20 && (
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

        {/* Tip */}
        <p className="text-center text-[11px] text-cream-muted/40 mt-6">
          You can leave this page — analysis continues in the background
        </p>
      </div>
    </div>
  );
}
