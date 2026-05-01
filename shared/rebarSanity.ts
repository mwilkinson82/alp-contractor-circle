export interface RebarSanityItem {
  csiCode?: string | null;
  csiDivision?: string | null;
  description?: string | null;
  quantity: number;
  unit: string;
  unitCost?: number;
  extendedCost?: number;
  materialCost?: number;
  laborCost?: number;
  confidence?: number;
  notes?: string | null;
  [key: string]: any;
}

const REBAR_LB_UNIT_COST_CENTS = 85;
const EXTREME_REBAR_LF = 20000;
const EXTREME_REBAR_LB = 50000;

function isRebarItem(item: RebarSanityItem): boolean {
  const text = `${item.description || ""} ${item.notes || ""}`.toLowerCase();
  return Boolean(item.csiCode?.startsWith("03 20") || /\brebar\b|\breinforc/.test(text));
}

function extractPounds(text: string): number | null {
  const match = text.match(/([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+(?:\.[0-9]+)?)\s*(?:lb|lbs|pounds?)\b/i);
  if (!match) return null;
  const parsed = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function appendNote(notes: string | null | undefined, note: string): string {
  const base = (notes || "").trim();
  return base ? `${base} ${note}` : note;
}

export function normalizeRebarUnitAndReview<T extends RebarSanityItem>(item: T): T {
  if (!isRebarItem(item)) return item;

  const unit = (item.unit || "").toUpperCase();
  const text = `${item.description || ""} ${item.notes || ""}`;
  const pounds = extractPounds(text);
  let next: T = item;

  if (unit === "LF" && pounds !== null) {
    const materialCost = Math.round(pounds * REBAR_LB_UNIT_COST_CENTS * 0.6);
    const laborCost = Math.round(pounds * REBAR_LB_UNIT_COST_CENTS * 0.4);
    next = {
      ...next,
      quantity: pounds,
      unit: "LB",
      unitCost: REBAR_LB_UNIT_COST_CENTS,
      extendedCost: pounds * REBAR_LB_UNIT_COST_CENTS,
      materialCost,
      laborCost,
      notes: appendNote(next.notes, "[Unit corrected: rebar quantity referenced pounds, so priced as LB instead of LF.]"),
    };
  }

  const nextUnit = (next.unit || "").toUpperCase();
  const qty = Number(next.quantity) || 0;
  const isExtreme = (nextUnit === "LF" && qty > EXTREME_REBAR_LF) || (nextUnit === "LB" && qty > EXTREME_REBAR_LB);
  if (isExtreme) {
    next = {
      ...next,
      confidence: Math.min(Number(next.confidence) || 100, 60),
      notes: appendNote(next.notes, "[Scope: review] Extreme generated rebar quantity; verify bar schedule, unit, and takeoff basis before including."),
    };
  }

  return next;
}
