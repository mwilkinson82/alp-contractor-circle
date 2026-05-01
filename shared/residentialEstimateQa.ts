export type ResidentialQaSeverity = "high" | "medium" | "low";
export type ResidentialQaKind =
  | "missing_allowance"
  | "scope_risk"
  | "detail_anchor"
  | "benchmark";

export interface ResidentialQaItem {
  id: string;
  severity: ResidentialQaSeverity;
  kind: ResidentialQaKind;
  title: string;
  message: string;
  amountCents?: number;
  action: string;
}

export interface ResidentialQaTakeoffItem {
  csiDivision?: string | null;
  description?: string | null;
  quantity?: string | number | null;
  unit?: string | null;
  unitCost?: string | number | null;
  extendedCost?: string | number | null;
  materialCost?: string | number | null;
  laborCost?: string | number | null;
  confidence?: number | null;
  notes?: string | null;
}

export interface ResidentialQaDivisionTotal {
  materialTotal: number;
  laborTotal: number;
}

export interface ResidentialQaAllowance {
  description?: string | null;
  amount?: number | null;
}

export interface ResidentialQaInput {
  items: ResidentialQaTakeoffItem[];
  byDivision: Record<string, ResidentialQaDivisionTotal>;
  directCostCents: number;
  allowances?: ResidentialQaAllowance[];
}

const REQUIRED_RESIDENTIAL_CATEGORIES = [
  {
    id: "cabinets",
    label: "Cabinets / millwork",
    keywords: ["cabinet", "cabinetry", "millwork", "vanity"],
    action: "Add or verify a cabinet/millwork allowance before final pricing.",
  },
  {
    id: "countertops",
    label: "Countertops",
    keywords: ["countertop", "counter top", "tops", "granite", "quartz", "stone top"],
    action: "Add or verify a countertop allowance tied to the owner selection level.",
  },
  {
    id: "appliances",
    label: "Appliances",
    keywords: ["appliance", "range", "oven", "cooktop", "refrigerator", "dishwasher"],
    action: "Add an appliance allowance or mark appliances owner-supplied.",
  },
  {
    id: "paint",
    label: "Painting package",
    keywords: ["paint", "primer", "coating"],
    action: "Confirm paint scope and labor before issuing the estimate.",
  },
  {
    id: "trim",
    label: "Interior doors / trim / hardware",
    keywords: ["interior door", "trim", "casing", "baseboard", "crown", "door hardware", "finish carpentry"],
    action: "Add trim, door, and hardware allowances or verify measured trim scope.",
  },
  {
    id: "flooring",
    label: "Interior flooring",
    keywords: ["flooring", "wood floor", "hardwood", "carpet", "vinyl floor", "floor finish"],
    action: "Add flooring allowances for selections that are not fully specified on drawings.",
  },
  {
    id: "final_clean_misc",
    label: "Final clean / punch / misc labor",
    keywords: ["final clean", "punch", "misc labor", "cleanup"],
    action: "Add final clean, punch, and miscellaneous labor placeholders.",
  },
];

function centsFromItem(item: ResidentialQaTakeoffItem): number {
  const ext = Number(item.extendedCost);
  if (Number.isFinite(ext) && ext > 0) return ext;

  const qty = Number(item.quantity);
  const unitCost = Number(item.unitCost);
  if (Number.isFinite(qty) && Number.isFinite(unitCost)) return qty * unitCost;
  return 0;
}

function lower(value: unknown): string {
  return String(value || "").toLowerCase();
}

function categoryHasCoverage(
  items: ResidentialQaTakeoffItem[],
  allowances: ResidentialQaAllowance[],
  keywords: string[]
): boolean {
  const itemText = items.map(item => `${item.description || ""} ${item.notes || ""}`).join(" ").toLowerCase();
  const allowanceText = allowances.map(a => a.description || "").join(" ").toLowerCase();
  return keywords.some(keyword => itemText.includes(keyword) || allowanceText.includes(keyword));
}

function pushFinding(findings: ResidentialQaItem[], item: ResidentialQaItem) {
  if (!findings.some(existing => existing.id === item.id)) findings.push(item);
}

export function analyzeResidentialEstimateQa(input: ResidentialQaInput): ResidentialQaItem[] {
  const items = input.items || [];
  const allowances = input.allowances || [];
  const directCost = Math.max(0, input.directCostCents || 0);
  const findings: ResidentialQaItem[] = [];

  for (const category of REQUIRED_RESIDENTIAL_CATEGORIES) {
    if (!categoryHasCoverage(items, allowances, category.keywords)) {
      pushFinding(findings, {
        id: `missing-${category.id}`,
        severity: "high",
        kind: "missing_allowance",
        title: `${category.label} missing`,
        message: "Residential drawings rarely carry enough information to price this selection accurately from takeoff alone.",
        action: category.action,
      });
    }
  }

  for (const item of items) {
    const desc = lower(item.description);
    const notes = lower(item.notes);
    const amount = centsFromItem(item);
    const div = String(item.csiDivision || "").padStart(2, "0");

    const isInferredDemo =
      div === "02" &&
      amount >= 2500000 &&
      /(demo|demolition|clearing|vegetation|existing conditions)/.test(desc) &&
      /(implied|vacant|assum|infer)/.test(`${desc} ${notes}`);
    if (isInferredDemo) {
      pushFinding(findings, {
        id: "scope-risk-inferred-demo",
        severity: "high",
        kind: "scope_risk",
        title: "Inferred site/demo cost",
        message: "A high-dollar Existing Conditions line appears to come from inferred vacancy or site-clearing language.",
        amountCents: amount,
        action: "Require explicit scope text or manual approval before applying material and labor.",
      });
    }

    const isDetailDerived =
      amount >= 2500000 &&
      /(detail|typical|generated|spacing|o\.c\.|on center)/.test(`${desc} ${notes}`) &&
      /(rafter tail|formwork|rebar|reinforc|tiledek|flashing|waterproof|membrane)/.test(desc);
    if (isDetailDerived) {
      pushFinding(findings, {
        id: `detail-anchor-${desc.slice(0, 32).replace(/[^a-z0-9]+/g, "-")}`,
        severity: "medium",
        kind: "detail_anchor",
        title: "Detail-derived quantity needs plan anchor",
        message: "This high-dollar line appears to be generated from a detail, typical note, or spacing rule.",
        amountCents: amount,
        action: "Verify the plan/elevation count before labor is applied.",
      });
    }
  }

  const concrete = input.byDivision["03"];
  if (concrete && directCost > 0) {
    const concreteTotal = concrete.materialTotal + concrete.laborTotal;
    if (concreteTotal / directCost > 0.22 && concreteTotal >= 10000000) {
      pushFinding(findings, {
        id: "benchmark-concrete-high",
        severity: "medium",
        kind: "benchmark",
        title: "Concrete division is unusually heavy",
        message: "Concrete is more than 22% of direct cost after labor. Residential estimates should verify rebar, formwork, and detail-derived scope before finalizing.",
        amountCents: concreteTotal,
        action: "Review Div 03 quantities and suppress detail-only generated lines that lack a plan anchor.",
      });
    }
  }

  const existing = input.byDivision["02"];
  if (existing && directCost > 0) {
    const existingTotal = existing.materialTotal + existing.laborTotal;
    if (existingTotal / directCost > 0.05 && existingTotal >= 2500000) {
      pushFinding(findings, {
        id: "benchmark-existing-high",
        severity: "medium",
        kind: "benchmark",
        title: "Existing Conditions is high for new residential work",
        message: "Existing Conditions exceeds 5% of direct cost. This is often a false positive when new-home drawings show a vacant lot.",
        amountCents: existingTotal,
        action: "Confirm demo/site-clearing scope before keeping this line in the estimate.",
      });
    }
  }

  return findings.sort((a, b) => {
    const rank: Record<ResidentialQaSeverity, number> = { high: 0, medium: 1, low: 2 };
    if (rank[a.severity] !== rank[b.severity]) return rank[a.severity] - rank[b.severity];
    return (b.amountCents || 0) - (a.amountCents || 0);
  });
}
