export const TAKEOFF_BID_MODES = [
  "full_gc",
  "trade_package",
  "fast_scope_check",
] as const;

export type TakeoffBidMode = (typeof TAKEOFF_BID_MODES)[number];

export const DEFAULT_NEW_TAKEOFF_BID_MODE: TakeoffBidMode = "full_gc";
export const LEGACY_TAKEOFF_BID_MODE_FALLBACK: TakeoffBidMode = "trade_package";

export interface BidModeBehavior {
  bidMode: TakeoffBidMode;
  label: string;
  shortLabel: string;
  description: string;
  reviewSurface: string;
  extractionStrategy: "broad" | "strict_scope" | "speed_first";
  sheetTriage: "all_buildable" | "scope_relevant" | "highest_signal";
  verification: "standard" | "fast_default" | "minimal";
  scopeStrictness: "broad" | "strict" | "review_first";
  maxFastSheets?: number;
}

export const BID_MODE_BEHAVIORS: Record<TakeoffBidMode, BidModeBehavior> = {
  full_gc: {
    bidMode: "full_gc",
    label: "Full GC Takeoff",
    shortLabel: "Full GC",
    description: "Broadest coverage across the full drawing set.",
    reviewSurface:
      "Broad trade estimate with active rows organized for GC review.",
    extractionStrategy: "broad",
    sheetTriage: "all_buildable",
    verification: "fast_default",
    scopeStrictness: "broad",
  },
  trade_package: {
    bidMode: "trade_package",
    label: "Trade Package Takeoff",
    shortLabel: "Trade Package",
    description: "Focused on your bid scope from a full set.",
    reviewSurface:
      "Active, needs-review, and boundary items separated before totals.",
    extractionStrategy: "strict_scope",
    sheetTriage: "scope_relevant",
    verification: "fast_default",
    scopeStrictness: "strict",
  },
  fast_scope_check: {
    bidMode: "fast_scope_check",
    label: "Fast Scope Check",
    shortLabel: "Fast Check",
    description:
      "Speed-first bid read for likely scope, risk, and budget signals.",
    reviewSurface:
      "Lean readout of likely scope items and visible risk/boundary rows.",
    extractionStrategy: "speed_first",
    sheetTriage: "highest_signal",
    verification: "minimal",
    scopeStrictness: "review_first",
    maxFastSheets: 24,
  },
};

export function normalizeTakeoffBidMode(
  value?: string | null,
  fallback: TakeoffBidMode = LEGACY_TAKEOFF_BID_MODE_FALLBACK
): TakeoffBidMode {
  return TAKEOFF_BID_MODES.includes(value as TakeoffBidMode)
    ? (value as TakeoffBidMode)
    : fallback;
}

export function getBidModeBehavior(value?: string | null): BidModeBehavior {
  return BID_MODE_BEHAVIORS[normalizeTakeoffBidMode(value)];
}

export function getTakeoffBidModeLabel(value?: string | null): string {
  return getBidModeBehavior(value).label;
}
