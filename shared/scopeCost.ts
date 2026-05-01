export interface ScopeCostItem {
  notes?: string | null;
  extendedCost?: number | string | null;
}

export function getScopeStatusFromNotes(notes?: string | null): "included" | "review" | "excluded" {
  const normalized = String(notes || "").toLowerCase();
  if (normalized.includes("[scope: excluded]")) return "excluded";
  if (normalized.includes("[scope: review]")) return "review";
  return "included";
}

export function isScopeExcludedItem(item: ScopeCostItem): boolean {
  return getScopeStatusFromNotes(item.notes) === "excluded";
}

export function sumScopeIncludedExtendedCost(items: ScopeCostItem[]): number {
  return items.reduce((sum, item) => {
    if (isScopeExcludedItem(item)) return sum;
    const cost = typeof item.extendedCost === "number"
      ? item.extendedCost
      : Number(item.extendedCost || 0);
    return sum + (Number.isFinite(cost) ? cost : 0);
  }, 0);
}
