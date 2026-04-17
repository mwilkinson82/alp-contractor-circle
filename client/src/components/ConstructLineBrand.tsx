/**
 * ConstructLine Brand Components — Reusable branded wordmark and module labels.
 *
 * Naming convention (Primavera P3/P6 style):
 * - ConstructLine (parent brand / suite)
 * - C1 — CPM Schedule
 * - C2 — Quantity Takeoff
 * - C3 — Cost Library
 */

interface ConstructLineWordmarkProps {
  /** Size variant */
  size?: "xs" | "sm" | "md" | "lg";
  /** Show "POWERED BY ALP" subtitle */
  showSubtitle?: boolean;
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
  className = "",
}: ConstructLineWordmarkProps) {
  const s = sizeMap[size];
  return (
    <div className={`flex flex-col ${className}`}>
      <span className={`${s.text} font-bold tracking-tight text-white leading-tight`}>
        Construct<span className="text-amber-400">Line</span>
      </span>
      {showSubtitle && (
        <span className={`${s.subtitle} text-gray-500 tracking-wider uppercase leading-tight`}>
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
export function ConstructLineInline({ className = "" }: { className?: string }) {
  return (
    <span className={`font-semibold ${className}`}>
      <span className="text-white">Construct</span>
      <span className="text-amber-400">Line</span>
    </span>
  );
}

/**
 * Module label constants.
 * Note: The C1/C2/C3... versioning convention (like Primavera P3/P6) is reserved
 * for future CPM Schedule product versions, not for labeling different tools.
 */
export const CL_MODULES = {
  CPM_SCHEDULE: { name: "CPM Schedule" },
  QUANTITY_TAKEOFF: { name: "Quantity Takeoff" },
  COST_LIBRARY: { name: "Cost Library" },
} as const;
