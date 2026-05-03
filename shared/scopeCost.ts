export interface ScopeCostItem {
  notes?: string | null;
  quantity?: number | string | null;
  unitCost?: number | string | null;
  materialCost?: number | string | null;
  laborCost?: number | string | null;
  extendedCost?: number | string | null;
}

export function getScopeStatusFromNotes(notes?: string | null): "included" | "review" | "excluded" {
  const normalized = String(notes || "").toLowerCase();
  if (normalized.includes("[scope: review]")) return "review";
  if (normalized.includes("[scope: excluded]") && normalized.includes("[scope: included]")) return "review";
  if (normalized.includes("[scope: excluded]")) return "excluded";
  return "included";
}

export function isScopeExcludedItem(item: ScopeCostItem): boolean {
  return getScopeStatusFromNotes(item.notes) === "excluded";
}

export function isScopeReviewItem(item: ScopeCostItem): boolean {
  return getScopeStatusFromNotes(item.notes) === "review";
}

export function isScopeIncludedItem(item: ScopeCostItem): boolean {
  return getScopeStatusFromNotes(item.notes) === "included";
}

export function sumScopeIncludedExtendedCost(items: ScopeCostItem[]): number {
  return items.reduce((sum, item) => {
    if (!isScopeIncludedItem(item)) return sum;
    const cost = typeof item.extendedCost === "number"
      ? item.extendedCost
      : Number(item.extendedCost || 0);
    return sum + (Number.isFinite(cost) ? cost : 0);
  }, 0);
}

function numeric(value: number | string | null | undefined): number {
  const result = Number(value || 0);
  return Number.isFinite(result) ? result : 0;
}

export function getScopeMaterialUnitCost(item: ScopeCostItem): number {
  const material = numeric(item.materialCost);
  if (material > 0) return material;
  const installed = numeric(item.unitCost);
  const labor = numeric(item.laborCost);
  return installed > labor ? installed - labor : installed;
}

export function sumScopeIncludedMaterialCost(items: ScopeCostItem[]): number {
  return items.reduce((sum, item) => {
    if (!isScopeIncludedItem(item)) return sum;
    return sum + numeric(item.quantity) * getScopeMaterialUnitCost(item);
  }, 0);
}

export function sumScopeIncludedLaborCost(items: ScopeCostItem[]): number {
  return items.reduce((sum, item) => {
    if (!isScopeIncludedItem(item)) return sum;
    return sum + numeric(item.quantity) * numeric(item.laborCost);
  }, 0);
}
