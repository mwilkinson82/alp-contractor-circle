import {
  getDrawingSheetsByProject,
  getTakeoffItemsByProject,
  getTakeoffProject,
} from "./takeoffDb";
import { replaceOpenTakeoffQaFindings } from "./takeoffObservabilityDb";
import type { InsertTakeoffQaFinding } from "../drizzle/schema";
import { isScopeIncludedItem } from "../shared/scopeCost";
import {
  buildEstimateIntelligenceFindings,
  type EstimateIntelligenceFinding,
  type EstimateIntelligenceProject,
  type EstimateIntelligenceSheet,
} from "../shared/estimateIntelligence";

type TakeoffItemRow = Awaited<
  ReturnType<typeof getTakeoffItemsByProject>
>[number];
type TakeoffProjectRow = Awaited<ReturnType<typeof getTakeoffProject>>;
type DrawingSheetRow = Awaited<
  ReturnType<typeof getDrawingSheetsByProject>
>[number];

type FindingDraft = Omit<
  InsertTakeoffQaFinding,
  "id" | "createdAt" | "updatedAt"
>;

const LOW_CONFIDENCE_THRESHOLD = 70;
const HIGH_VALUE_GENERATED_CENTS = 25_000_00;
const DUPLICATE_GROUP_VALUE_CENTS = 10_000_00;

function numeric(value: unknown): number {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function itemCostCents(item: TakeoffItemRow): number {
  return numeric(item.extendedCost);
}

function itemQuantity(item: TakeoffItemRow): number {
  return numeric(item.quantity);
}

function normalizeDescription(value: string | null | undefined): string {
  return String(value || "")
    .toLowerCase()
    .replace(/\[[^\]]+\]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(
      /\b(and|with|for|the|at|of|to|in|on|typical|visible|based)\b/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function notesLookGenerated(notes: string | null | undefined): boolean {
  const normalized = String(notes || "").toLowerCase();
  return (
    normalized.includes("generated") ||
    normalized.includes("assume") ||
    normalized.includes("assumed") ||
    normalized.includes("calculated") ||
    normalized.includes("extrapolated")
  );
}

function buildFinding(
  projectId: number,
  runId: number | null | undefined,
  findingKey: string,
  severity: FindingDraft["severity"],
  category: string,
  title: string,
  description: string,
  items: TakeoffItemRow[]
): FindingDraft {
  return {
    projectId,
    runId: runId || null,
    findingKey,
    severity,
    category,
    title,
    description,
    amountCents: items.reduce((sum, item) => sum + itemCostCents(item), 0),
    itemCount: items.length,
    itemIds: items.map(item => item.id),
    status: "open",
  } as any;
}

function buildIntelligenceFinding(
  projectId: number,
  runId: number | null | undefined,
  finding: EstimateIntelligenceFinding,
  itemLookup: Map<string, TakeoffItemRow>
): FindingDraft {
  const linkedItems = finding.itemIds
    .map(id => itemLookup.get(String(id)))
    .filter((item): item is TakeoffItemRow => Boolean(item));

  return {
    projectId,
    runId: runId || null,
    findingKey: finding.id,
    severity: finding.severity,
    category: finding.category,
    title: finding.title,
    description: [
      finding.description,
      ...finding.guidance.map(step => `Next: ${step}`),
    ].join("\n"),
    amountCents: finding.amountCents,
    itemCount: linkedItems.length,
    itemIds: linkedItems.map(item => item.id),
    status: "open",
  } as any;
}

export function buildTakeoffQaFindings(
  projectId: number,
  runId: number | null | undefined,
  items: TakeoffItemRow[],
  context: {
    project?: TakeoffProjectRow | null;
    sheets?: DrawingSheetRow[];
  } = {}
): FindingDraft[] {
  const accepted = items.filter(item => isScopeIncludedItem(item as any));
  const findings: FindingDraft[] = [];
  const itemLookup = new Map(items.map(item => [String(item.id), item]));

  const intelligenceFindings = buildEstimateIntelligenceFindings({
    project: context.project as EstimateIntelligenceProject | null | undefined,
    sheets: (context.sheets || []) as EstimateIntelligenceSheet[],
    items: items as any,
  });
  for (const finding of intelligenceFindings) {
    findings.push(
      buildIntelligenceFinding(projectId, runId, finding, itemLookup)
    );
  }

  const zeroAccepted = accepted.filter(
    item => itemQuantity(item) <= 0 || itemCostCents(item) <= 0
  );
  if (zeroAccepted.length > 0) {
    findings.push(
      buildFinding(
        projectId,
        runId,
        "accepted_scope_with_zero_value",
        "blocker",
        "pricing",
        "Accepted scope with zero value",
        "Accepted rows are counted as bid scope but have no cost impact.",
        zeroAccepted
      )
    );
  }

  const missingQuantity = accepted.filter(item => itemQuantity(item) <= 0);
  if (missingQuantity.length > 0) {
    findings.push(
      buildFinding(
        projectId,
        runId,
        "accepted_rows_missing_quantity",
        "blocker",
        "quantity",
        "Accepted rows missing quantity",
        "These rows cannot be defended until quantity is filled or verified.",
        missingQuantity
      )
    );
  }

  const lowConfidence = accepted.filter(
    item =>
      numeric(item.confidence) > 0 &&
      numeric(item.confidence) < LOW_CONFIDENCE_THRESHOLD
  );
  if (lowConfidence.length > 0) {
    findings.push(
      buildFinding(
        projectId,
        runId,
        "low_confidence_takeoff_rows",
        "review",
        "ai_evidence",
        "Low-confidence takeoff rows",
        "AI confidence is below the review threshold. Verify source sheets before relying on these rows.",
        lowConfidence
      )
    );
  }

  const generatedHighValue = accepted.filter(
    item =>
      !item.reviewed &&
      itemCostCents(item) >= HIGH_VALUE_GENERATED_CENTS &&
      notesLookGenerated(item.notes)
  );
  if (generatedHighValue.length > 0) {
    findings.push(
      buildFinding(
        projectId,
        runId,
        "generated_high_value_accepted_rows",
        "blocker",
        "estimator_review",
        "Generated high-value accepted rows",
        "ConstructLine generated or assumed quantities on accepted dollar-impact rows. An estimator should confirm the takeoff basis before packaging.",
        generatedHighValue
      )
    );
  }

  const duplicateGroups = new Map<string, TakeoffItemRow[]>();
  for (const item of accepted) {
    const key = `${item.csiDivision || ""}:${item.unit || ""}:${normalizeDescription(item.description)}`;
    if (!key.trim()) continue;
    const group = duplicateGroups.get(key) || [];
    group.push(item);
    duplicateGroups.set(key, group);
  }
  const duplicateItems = Array.from(duplicateGroups.values())
    .filter(group => group.length > 1)
    .flat()
    .filter(item => itemCostCents(item) >= DUPLICATE_GROUP_VALUE_CENTS);
  if (duplicateItems.length > 0) {
    findings.push(
      buildFinding(
        projectId,
        runId,
        "probable_duplicate_assembly_pricing",
        "risk",
        "duplicate_scope",
        "Probable duplicate assembly pricing",
        "Accepted rows appear to price the same assembly or footprint more than once. Confirm each row has a unique scope basis.",
        duplicateItems
      )
    );
  }

  const sourceUnlinked = accepted.filter(item => !item.sheetId);
  if (sourceUnlinked.length > 0) {
    findings.push(
      buildFinding(
        projectId,
        runId,
        "accepted_scope_missing_source",
        "review",
        "source_evidence",
        "Accepted scope missing source",
        "Accepted rows should remain tied to drawing evidence before the bid is packaged.",
        sourceUnlinked
      )
    );
  }

  return findings;
}

export async function refreshTakeoffQaFindings(
  projectId: number,
  runId?: number | null
): Promise<FindingDraft[]> {
  const [project, items, sheets] = await Promise.all([
    getTakeoffProject(projectId),
    getTakeoffItemsByProject(projectId),
    getDrawingSheetsByProject(projectId),
  ]);
  const findings = buildTakeoffQaFindings(projectId, runId, items, {
    project,
    sheets,
  });
  await replaceOpenTakeoffQaFindings(projectId, runId || null, findings as any);
  return findings;
}
