import { isScopeIncludedItem } from "./scopeCost";

export type EstimateIntelligenceSeverity =
  | "blocker"
  | "risk"
  | "review"
  | "reference";

export interface EstimateIntelligenceProject {
  name?: string | null;
  projectName?: string | null;
  description?: string | null;
  location?: string | null;
  projectType?: string | null;
  bidMode?: string | null;
  scopeText?: string | null;
  selectedDivisions?: unknown;
  selectedSpecialties?: unknown;
  allowances?: unknown;
  totalEstimatedCost?: number | string | null;
}

export interface EstimateIntelligenceItem {
  id?: number | string | null;
  sheetId?: number | string | null;
  csiDivision?: string | null;
  csiCode?: string | null;
  description?: string | null;
  notes?: string | null;
  unit?: string | null;
  quantity?: number | string | null;
  extendedCost?: number | string | null;
  confidence?: number | string | null;
  reviewed?: boolean | null;
}

export interface EstimateIntelligenceSheet {
  id?: number | string | null;
  sheetName?: string | null;
  sheetType?: string | null;
  originalFilename?: string | null;
  pageNumber?: number | string | null;
}

export interface EstimateIntelligenceFinding {
  id: string;
  severity: EstimateIntelligenceSeverity;
  category: string;
  title: string;
  description: string;
  amountCents: number;
  itemIds: Array<number | string>;
  guidance: string[];
}

export interface EstimateIntelligenceInput {
  project?: EstimateIntelligenceProject | null;
  items?: EstimateIntelligenceItem[];
  sheets?: EstimateIntelligenceSheet[];
}

const MIN_PROJECT_COST_FOR_COVERAGE_CHECKS = 100_000_00;

function numeric(value: unknown): number {
  const result = Number(value || 0);
  return Number.isFinite(result) ? result : 0;
}

function money(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.round(cents / 100));
}

function parseUnknownList(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map(entry => String(entry || "").trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      return parseUnknownList(JSON.parse(trimmed));
    } catch {
      return trimmed
        .split(/[,\n]/)
        .map(entry => entry.trim())
        .filter(Boolean);
    }
  }
  return [];
}

function normalizeDivision(value: unknown): string | null {
  const text = String(value || "");
  const match = text.match(/\b(\d{2})\b/);
  return match ? match[1] : null;
}

function getItemDivision(item: EstimateIntelligenceItem): string {
  return (
    normalizeDivision(item.csiDivision) ||
    normalizeDivision(item.csiCode) ||
    "00"
  );
}

function getItemId(item: EstimateIntelligenceItem): number | string | null {
  return item.id ?? null;
}

function getItemCost(item: EstimateIntelligenceItem): number {
  return numeric(item.extendedCost);
}

function getItemText(item: EstimateIntelligenceItem): string {
  return [
    item.description,
    item.notes,
    item.csiCode,
    item.csiDivision,
    item.unit,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function getSheetText(sheet: EstimateIntelligenceSheet): string {
  return [sheet.sheetName, sheet.sheetType, sheet.originalFilename]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function hasAnyTerm(text: string, terms: string[]): boolean {
  return terms.some(term => text.includes(term));
}

function collectTopItemIds(
  items: EstimateIntelligenceItem[],
  limit = 8
): Array<number | string> {
  return [...items]
    .sort((a, b) => getItemCost(b) - getItemCost(a))
    .map(getItemId)
    .filter((id): id is number | string => id !== null)
    .slice(0, limit);
}

function totalCost(items: EstimateIntelligenceItem[]): number {
  return items.reduce((sum, item) => sum + getItemCost(item), 0);
}

function hasAllowances(value: unknown): boolean {
  const entries = parseUnknownList(value);
  if (entries.length > 0) return true;
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") return Object.keys(value).length > 0;
  return false;
}

function isFullGcScope(project?: EstimateIntelligenceProject | null): boolean {
  const bidMode = String(project?.bidMode || "full_gc").toLowerCase();
  if (bidMode !== "full_gc") return false;
  return parseUnknownList(project?.selectedDivisions).length === 0;
}

function projectText(project?: EstimateIntelligenceProject | null): string {
  return [
    project?.name,
    project?.projectName,
    project?.description,
    project?.location,
    project?.projectType,
    project?.scopeText,
    ...parseUnknownList(project?.selectedSpecialties),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function makeFinding(
  id: string,
  severity: EstimateIntelligenceSeverity,
  category: string,
  title: string,
  description: string,
  amountCents: number,
  itemIds: Array<number | string>,
  guidance: string[]
): EstimateIntelligenceFinding {
  return {
    id,
    severity,
    category,
    title,
    description,
    amountCents: Math.max(0, Math.round(amountCents)),
    itemIds,
    guidance,
  };
}

export function buildEstimateIntelligenceFindings({
  project,
  items = [],
  sheets = [],
}: EstimateIntelligenceInput): EstimateIntelligenceFinding[] {
  const accepted = items.filter(item => isScopeIncludedItem(item as any));
  if (accepted.length === 0) return [];

  const directCost =
    totalCost(accepted) || numeric(project?.totalEstimatedCost) || 0;
  if (directCost <= 0) return [];

  const fullGc = isFullGcScope(project);
  const itemText = accepted.map(getItemText).join(" ");
  const sheetText = sheets.map(getSheetText).join(" ");
  const allText = `${projectText(project)} ${itemText} ${sheetText}`;
  const findings: EstimateIntelligenceFinding[] = [];

  const divisionItems = new Map<string, EstimateIntelligenceItem[]>();
  for (const item of accepted) {
    const division = getItemDivision(item);
    const group = divisionItems.get(division) || [];
    group.push(item);
    divisionItems.set(division, group);
  }

  const sumDivisions = (divisions: string[]) =>
    divisions.reduce(
      (sum, div) => sum + totalCost(divisionItems.get(div) || []),
      0
    );
  const itemsForDivisions = (divisions: string[]) =>
    divisions.flatMap(div => divisionItems.get(div) || []);

  if (fullGc && directCost >= MIN_PROJECT_COST_FOR_COVERAGE_CHECKS) {
    const generalConditions = sumDivisions(["01"]);
    const minGeneralConditions = Math.max(directCost * 0.03, 20_000_00);
    if (generalConditions < minGeneralConditions) {
      findings.push(
        makeFinding(
          "full-gc-general-conditions-thin",
          "review",
          "Scope coverage",
          "General conditions look thin for a full GC bid",
          `ConstructLine found ${money(generalConditions)} in Division 01 against ${money(directCost)} of accepted direct cost. Full GC bids usually need supervision, temporary facilities, mobilization, closeout, cleanup, and project administration carried somewhere.`,
          minGeneralConditions - generalConditions,
          collectTopItemIds(itemsForDivisions(["01"])),
          [
            "Confirm whether general conditions are intentionally carried in markup or excluded from this draft.",
            "If the bid total should include them, add a Division 01 allowance or line-item package before proposal review.",
          ]
        )
      );
    }

    const mepDivisions = ["21", "22", "23", "26", "27", "28"];
    const mepCost = sumDivisions(mepDivisions);
    const hasMepSignal =
      hasAnyTerm(sheetText, [
        "electrical",
        "plumbing",
        "mechanical",
        "hvac",
        "mep",
        "fire alarm",
        "sprinkler",
      ]) ||
      hasAnyTerm(allText, [
        "electrical",
        "plumbing",
        "mechanical",
        "hvac",
        "mep",
        "fire alarm",
        "sprinkler",
        "low voltage",
        "power",
        "lighting",
      ]);
    const minMep = Math.max(directCost * 0.08, 50_000_00);
    if ((hasMepSignal || directCost >= 500_000_00) && mepCost < minMep) {
      findings.push(
        makeFinding(
          "full-gc-mep-coverage-thin",
          "risk",
          "Scope coverage",
          "MEP and specialty trades look thin",
          `ConstructLine only found ${money(mepCost)} across fire protection, plumbing, HVAC, electrical, low-voltage, and similar trades. For a full GC bid, that usually means subcontractor quotes, allowances, or explicit exclusions need to be documented.`,
          minMep - mepCost,
          collectTopItemIds(itemsForDivisions(mepDivisions)),
          [
            "Verify whether MEP drawings/specs are included in the set or being priced by subcontractor quotes outside ConstructLine.",
            "If the GC owns this scope, add quote placeholders or allowances for each missing trade before relying on the draft total.",
            "If excluded, make the exclusion explicit in the proposal instead of letting the estimate look complete.",
          ]
        )
      );
    }

    const siteDivisions = ["31", "32", "33"];
    const siteCost = sumDivisions(siteDivisions);
    const hasSiteSignal = hasAnyTerm(allText, [
      "site plan",
      "civil",
      "grading",
      "drainage",
      "storm",
      "utility",
      "utilities",
      "paving",
      "asphalt",
      "concrete paving",
      "landscape",
      "irrigation",
      "parking",
      "curb",
      "sidewalk",
    ]);
    const minSite = Math.max(directCost * 0.05, 30_000_00);
    if (hasSiteSignal && siteCost < minSite) {
      findings.push(
        makeFinding(
          "full-gc-site-civil-coverage-thin",
          "risk",
          "Scope coverage",
          "Site and civil scope needs confirmation",
          `ConstructLine found ${money(siteCost)} in earthwork, exterior improvements, and utilities. The drawing context suggests site/civil work may exist, so this should be confirmed with drawings, civil sheets, vendor quotes, or proposal exclusions.`,
          minSite - siteCost,
          collectTopItemIds(itemsForDivisions(siteDivisions)),
          [
            "Check civil/site sheets for grading, paving, striping, drainage, utility connections, landscaping, and site concrete.",
            "Add allowances or exclusions for site work that is not supported by the extracted rows.",
          ]
        )
      );
    }
  }

  const vendorTerms = [
    "owner furnished",
    "ofci",
    "vendor",
    "allowance",
    "equipment package",
    "equipment cost",
    "specialty equipment",
    "kitchen equipment",
    "car wash",
    "conveyor",
    "compressor",
    "pump system",
    "elevator",
    "signage",
    "sign permit",
    "impact fee",
    "tap fee",
    "utility connection",
    "testing",
    "inspection",
    "commissioning",
  ];
  const vendorItems = accepted.filter(item =>
    hasAnyTerm(getItemText(item), vendorTerms)
  );
  const vendorCost = totalCost(vendorItems);
  const minVendorAttention = Math.max(directCost * 0.02, 15_000_00);
  const hasVendorSignal =
    vendorItems.length > 0 || hasAnyTerm(allText, vendorTerms);
  if (hasVendorSignal && vendorCost < minVendorAttention) {
    findings.push(
      makeFinding(
        "vendor-allowance-scope-needs-pricing-basis",
        "review",
        "Allowances",
        "Vendor or allowance scope needs a pricing basis",
        `The takeoff contains signals for vendor-priced, owner-furnished, fee, testing, equipment, or specialty scope, but only ${money(vendorCost)} is currently tied to accepted rows.`,
        minVendorAttention - vendorCost,
        collectTopItemIds(vendorItems),
        [
          "Confirm whether these scopes are carried by a vendor quote, owner allowance, subcontractor proposal, or explicit exclusion.",
          "Add placeholder allowances for material scopes that cannot be measured reliably from drawings alone.",
        ]
      )
    );
  }

  if (fullGc && hasVendorSignal && !hasAllowances(project?.allowances)) {
    findings.push(
      makeFinding(
        "full-gc-allowance-log-empty",
        "review",
        "Allowances",
        "Allowance log is empty for a scope-sensitive bid",
        "ConstructLine found project signals that often require allowances or vendor quotes, but the project allowance log is empty.",
        Math.max(directCost * 0.02, 10_000_00),
        [],
        [
          "Use the allowance log for scopes that need external pricing, owner decisions, or proposal qualification.",
          "This keeps the draft estimate honest without forcing the AI to invent a hard number where a quote belongs.",
        ]
      )
    );
  }

  return findings.sort((a, b) => {
    const severityRank: Record<EstimateIntelligenceSeverity, number> = {
      blocker: 0,
      risk: 1,
      review: 2,
      reference: 3,
    };
    const rankDiff = severityRank[a.severity] - severityRank[b.severity];
    if (rankDiff !== 0) return rankDiff;
    return b.amountCents - a.amountCents;
  });
}
