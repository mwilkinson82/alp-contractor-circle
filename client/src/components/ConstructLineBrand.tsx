/**
 * ConstructLine Brand Components — Reusable branded wordmark and module labels.
 *
 * Naming convention:
 * - ConstructLine (parent brand / suite)
 * - Hub — suite landing page
 * - Basis — estimating cockpit
 * - Baseline — CPM scheduling
 */

interface ConstructLineWordmarkProps {
  /** Size variant */
  size?: "xs" | "sm" | "md" | "lg";
  /** Show "POWERED BY ALP" subtitle */
  showSubtitle?: boolean;
  /** Color treatment */
  tone?: "dark" | "light";
  /** Additional className */
  className?: string;
}

const sizeMap = {
  xs: { text: "text-xs", subtitle: "text-[7px]" },
  sm: { text: "text-sm", subtitle: "text-[8px]" },
  md: { text: "text-xl", subtitle: "text-[9px]" },
  lg: { text: "text-2xl", subtitle: "text-[10px]" },
};

/**
 * Branded ConstructLine wordmark — white "Construct" + amber "Line" with optional subtitle.
 */
export function ConstructLineWordmark({
  size = "md",
  showSubtitle = true,
  tone = "dark",
  className = "",
}: ConstructLineWordmarkProps) {
  const s = sizeMap[size];
  const textClass = tone === "light" ? "text-[#171714]" : "text-white";
  const subtitleClass = tone === "light" ? "text-[#8a806d]" : "text-gray-500";
  return (
    <div className={`flex flex-col ${className}`}>
      <span
        className={`${s.text} font-bold tracking-tight ${textClass} leading-tight`}
      >
        Construct
        <span
          className={tone === "light" ? "text-[#d9a21a]" : "text-amber-400"}
        >
          Line
        </span>
      </span>
      {showSubtitle && (
        <span
          className={`${s.subtitle} ${subtitleClass} tracking-wider uppercase leading-tight`}
        >
          Powered by ALP
        </span>
      )}
    </div>
  );
}

/**
 * Inline branded text — for use inside sentences.
 * Renders "ConstructLine" with the branded color split.
 */
export function ConstructLineInline({
  className = "",
}: {
  className?: string;
}) {
  return (
    <span className={`font-semibold ${className}`}>
      <span className="text-white">Construct</span>
      <span className="text-amber-400">Line</span>
    </span>
  );
}

/**
 * Module label constants.
 * These constants keep old internal identifiers stable while the UI uses the
 * customer-facing product names.
 */
export const CL_MODULES = {
  CPM_SCHEDULE: { name: "Baseline" },
  QUANTITY_TAKEOFF: { name: "Basis" },
  COST_LIBRARY: { name: "Cost Library" },
  TRADE_RATE_LIBRARY: { name: "Trade Rate Library" },
} as const;
