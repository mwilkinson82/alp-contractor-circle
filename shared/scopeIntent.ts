export type ScopeMatchStatus = "included" | "excluded" | "review";

export interface ScopeIntent {
  hasScope: boolean;
  originalText: string;
  normalizedText: string;
  summary: string;
  presetIds: string[];
  includeKeywords: string[];
  excludeKeywords: string[];
  needsReviewKeywords: string[];
  focusDivisions: string[];
  excludedDivisions: string[];
}

interface ScopePreset {
  id: string;
  patterns: RegExp[];
  summary: string;
  includeKeywords: string[];
  excludeKeywords: string[];
  needsReviewKeywords?: string[];
  focusDivisions: string[];
  excludedDivisions?: string[];
}

const FOUNDATION_EXCLUDED_DIVISIONS = [
  "04", "05", "06", "08", "09", "10", "11", "12", "13", "14",
  "21", "22", "23", "26", "27", "28", "33",
];

const SCOPE_PRESETS: ScopePreset[] = [
  {
    id: "underground_concrete_below_grade_waterproofing",
    patterns: [
      /underground.*concrete.*below[-\s]?grade.*waterproof/i,
      /below[-\s]?grade.*waterproof.*underground.*concrete/i,
      /foundation\s+concrete.*below[-\s]?grade.*waterproof/i,
      /below[-\s]?grade.*waterproof.*foundation\s+concrete/i,
    ],
    summary: "Underground concrete plus below-grade waterproofing",
    includeKeywords: [
      "underground concrete", "foundation concrete", "structural concrete",
      "trench pit", "trenches", "pit", "pits", "correlator pit",
      "footing", "footings", "grade beam", "foundation wall", "slab on grade",
      "sog", "rebar", "reinforcing", "formwork", "forms", "concrete",
      "vapor barrier", "vapor retarder", "waterproof", "waterproofing",
      "below grade", "membrane", "protection board", "drainage board",
      "foundation drain", "waterstop", "excavation", "backfill", "trench",
    ],
    excludeKeywords: ["roof", "roofing", "siding", "window", "door", "interior finish", "paint", "drywall", "masonry veneer"],
    needsReviewKeywords: ["utility", "dewatering", "insulation", "flashing", "penetration", "sheet metal"],
    focusDivisions: ["03", "07", "31", "33"],
    excludedDivisions: ["04", "05", "06", "08", "09", "10", "11", "12", "13", "14", "21", "22", "23", "26", "27", "28", "32"],
  },
  {
    id: "below_grade_waterproofing",
    patterns: [/below[-\s]?grade.*waterproof/i, /waterproof.*below[-\s]?grade/i, /dampproof/i, /waterproofing/i],
    summary: "Below-grade waterproofing and drainage at foundation/trench conditions",
    includeKeywords: [
      "below grade", "waterproof", "waterproofing", "dampproof", "damp proof",
      "vapor barrier", "vapor retarder", "membrane", "protection board",
      "drainage board", "foundation drain", "waterstop", "keyway waterstop",
      "below-grade barrier", "below grade barrier", "sealant", "bentonite",
    ],
    excludeKeywords: [
      "general concrete", "slab on grade", "slab-on-grade", "footing", "footings",
      "rebar", "reinforcing", "formwork", "concrete", "cmu", "masonry",
      "structural steel", "mep", "plumbing", "hvac", "electrical", "roof",
      "roofing", "eifs", "batt insulation", "above-grade envelope", "siding",
      "window", "door", "interior finish", "paint", "drywall",
    ],
    needsReviewKeywords: ["flashing", "sheet metal", "joint", "penetration"],
    focusDivisions: ["07", "31", "33"],
    excludedDivisions: ["03", "04", "05", "06", "08", "09", "10", "11", "12", "13", "14", "21", "22", "23", "26", "27", "28", "32"],
  },
  {
    id: "piles_deep_foundations",
    patterns: [/pile/i, /caisson/i, /drilled pier/i, /deep foundation/i, /helical/i],
    summary: "Piles, piers, and deep foundation work",
    includeKeywords: [
      "pile", "piles", "caisson", "drilled pier", "helical", "micropile",
      "deep foundation", "grade beam", "pile cap", "cap", "reinforcing", "rebar",
      "concrete", "excavation", "spoils",
    ],
    excludeKeywords: ["masonry", "steel framing", "roof", "drywall", "finish", "door", "window"],
    needsReviewKeywords: ["earthwork", "dewatering", "testing", "layout", "survey"],
    focusDivisions: ["03", "31"],
    excludedDivisions: ["04", "05", "06", "07", "08", "09", "10", "11", "12", "13", "14", "21", "22", "23", "26", "27", "28", "32", "33"],
  },
  {
    id: "foundations",
    patterns: [/\bfoundations?\s+(?:only|concrete|walls?|work|package|scope)\b/i, /footing/i, /grade beam/i, /slab.on.grade/i, /\bsog\b/i],
    summary: "Foundations, footings, slabs-on-grade, and directly related below-grade work",
    includeKeywords: [
      "foundation", "footing", "footings", "grade beam", "pile cap", "slab on grade",
      "sog", "stem wall", "foundation wall", "rebar", "reinforcing", "anchor bolt",
      "vapor barrier", "waterproof", "dampproof", "excavation", "backfill", "base course",
    ],
    excludeKeywords: ["masonry wall", "steel beam", "steel column", "roof", "drywall", "paint", "ceiling", "door", "window"],
    needsReviewKeywords: ["underslab", "utility", "drain", "waterstop", "insulation"],
    focusDivisions: ["03", "07", "31"],
    excludedDivisions: FOUNDATION_EXCLUDED_DIVISIONS,
  },
  {
    id: "site_utilities",
    patterns: [/site utilit/i, /storm/i, /sanitary/i, /sewer/i, /water service/i],
    summary: "Site utilities and utility trenching",
    includeKeywords: ["storm", "sanitary", "sewer", "water service", "utility", "pipe", "manhole", "catch basin", "trench", "backfill"],
    excludeKeywords: ["roof drain", "plumbing fixture", "interior", "masonry", "steel", "drywall"],
    needsReviewKeywords: ["tie-in", "connection", "sleeve", "cleanout"],
    focusDivisions: ["31", "33"],
    excludedDivisions: ["03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13", "14", "21", "22", "23", "26", "27", "28", "32"],
  },
];

const GENERIC_EXCLUDE_PATTERNS: Array<{ pattern: RegExp; divisions: string[] }> = [
  { pattern: /\bno\s+site\b|\bexclude\s+site\b|\bno\s+sitework\b|\bexclude\s+sitework\b/i, divisions: ["31", "32", "33"] },
  { pattern: /\bno\s+landscap|\bexclude\s+landscap/i, divisions: ["32"] },
  { pattern: /\bno\s+mep\b|\bexclude\s+mep\b/i, divisions: ["21", "22", "23", "25", "26", "27", "28"] },
  { pattern: /\bno\s+finish|\bexclude\s+finish/i, divisions: ["09", "10", "12"] },
  { pattern: /\bno\s+vertical\b|\bnone\s+of\s+the\s+vertical\b|\bnot\s+vertical\b/i, divisions: ["04", "05", "06", "08", "09", "10", "11", "12", "13", "14"] },
];

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

function containsAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword.toLowerCase()));
}

function explicitlyAllowsConcreteScope(text: string): boolean {
  const includeConcretePattern = /\b(include|including|with)\b[^.]*\b(underground concrete|trench concrete|pit concrete|foundation concrete|foundations?(?!\s+drains?)|pits?|rebar|reinforcing|formwork|footings?|slab(?:-on-grade| on grade)?|sog)\b/;
  if (explicitlyExcludesConcreteScope(text) && !includeConcretePattern.test(text)) {
    return false;
  }
  return includeConcretePattern.test(text) ||
    /\b(underground|trench|pit|foundation)\s+concrete\b/.test(text) ||
    /\bfoundations?\s+(?:only|scope|package|concrete|walls?|work)\b/.test(text) ||
    /\bpits?\b/.test(text);
}

function explicitlyExcludesConcreteScope(text: string): boolean {
  return /\b(exclude|no)\b.*\b(?:general\s+)?(?:concrete|slabs?|slab-on-grade|slab on grade|sog|footings?|rebar|reinforcing|structural reinforcing|formwork|trench concrete|pit concrete|foundations?)\b/.test(text);
}

const ROOFING_SCOPE_EXCLUDE_PATTERNS = [
  /\broofs?\b/i,
  /\broofing\b/i,
  /\broof\s+membrane\b/i,
  /\broofing\s+membrane\b/i,
  /\btpo\b/i,
  /\bepdm\b/i,
  /\bpvc\s+roof\b/i,
  /\broof\s+underlayment\b/i,
  /\broof\s+insulation\b/i,
  /\broof\s+flashing\b/i,
];

export function buildScopeIntent(scopeText?: string | null, selectedDivisions?: string[] | null): ScopeIntent {
  const originalText = (scopeText || "").trim();
  if (!originalText) {
    return {
      hasScope: false,
      originalText: "",
      normalizedText: "",
      summary: "Full drawing set",
      presetIds: [],
      includeKeywords: [],
      excludeKeywords: [],
      needsReviewKeywords: [],
      focusDivisions: selectedDivisions?.length ? unique(selectedDivisions) : [],
      excludedDivisions: [],
    };
  }

  const normalizedText = originalText.toLowerCase();
  const belowGradeWaterproofingOnly = /\bbelow[-\s]?grade\s+waterproofing\s+only\b/i.test(originalText);
  const narrowWaterproofingWithConcreteExclusions = belowGradeWaterproofingOnly &&
    explicitlyExcludesConcreteScope(normalizedText) &&
    !explicitlyAllowsConcreteScope(normalizedText);
  const matched = SCOPE_PRESETS
    .filter((preset) => preset.patterns.some((pattern) => pattern.test(originalText)))
    .filter((preset) => {
      if (!narrowWaterproofingWithConcreteExclusions) return true;
      return !["underground_concrete_below_grade_waterproofing", "foundations", "piles_deep_foundations"].includes(preset.id);
    });
  const focusDivisions = unique([
    ...(selectedDivisions || []),
    ...matched.flatMap((preset) => preset.focusDivisions),
  ]);
  const excludedDivisions = unique([
    ...matched.flatMap((preset) => preset.excludedDivisions || []),
    ...GENERIC_EXCLUDE_PATTERNS
      .filter(({ pattern }) => pattern.test(originalText))
      .flatMap(({ divisions }) => divisions),
  ].filter((division) => !focusDivisions.includes(division)));

  return {
    hasScope: true,
    originalText,
    normalizedText,
    summary: matched.length > 0 ? matched.map((preset) => preset.summary).join("; ") : "Custom contractor scope",
    presetIds: matched.map((preset) => preset.id),
    includeKeywords: unique(matched.flatMap((preset) => preset.includeKeywords)),
    excludeKeywords: unique(matched.flatMap((preset) => preset.excludeKeywords)),
    needsReviewKeywords: unique(matched.flatMap((preset) => preset.needsReviewKeywords || [])),
    focusDivisions,
    excludedDivisions,
  };
}

export function classifyScopeMatch(
  item: { csiDivision?: string | null; csiCode?: string | null; description?: string | null; notes?: string | null },
  intent: ScopeIntent
): ScopeMatchStatus {
  if (!intent.hasScope) return "included";

  const division = (item.csiDivision || item.csiCode?.slice(0, 2) || "").trim();
  const text = `${item.description || ""} ${item.notes || ""}`.toLowerCase();
  const allowsConcrete = intent.presetIds.some((id) =>
    id === "underground_concrete_below_grade_waterproofing" ||
    id === "foundations" ||
    id === "piles_deep_foundations"
  ) || explicitlyAllowsConcreteScope(intent.normalizedText);
  const explicitlyExcludesGeneralConcrete = /\b(exclude|no)\s+(?:general\s+)?concrete\b/.test(intent.normalizedText);
  const isBelowGradeWaterproofingOnly = intent.presetIds.includes("below_grade_waterproofing") && !allowsConcrete;
  const explicitlyIncludesBaseFill = /\b(include|including|with)\b[^.]*\b(compacted base|aggregate base|base course|slab fill|structural fill|engineered fill|termite treatment)\b/.test(intent.normalizedText);
  const explicitlyIncludesInsulation = /\b(include|including|with)\b[^.]*\b(rigid insulation|insulation board|perimeter insulation|below[-\s]?grade insulation)\b/.test(intent.normalizedText);

  if (explicitlyExcludesGeneralConcrete && division === "03" && !/\b(waterstop|vapor barrier|vapor retarder)\b/.test(text)) {
    return "excluded";
  }

  if (ROOFING_SCOPE_EXCLUDE_PATTERNS.some((pattern) => pattern.test(text))) {
    return "excluded";
  }

  if (isBelowGradeWaterproofingOnly) {
    if (/\b(general concrete|cast[-\s]?in[-\s]?place|concrete|slab(?:-on-grade| on grade)?|sog|footings?|wf footing|wall footing|spread footing|equipment pole foundations?|rebar|reinforcing|structural reinforcing|formwork|trench concrete|pit concrete|foundation wall|grade beam)\b/.test(text) &&
      !/\b(waterstop|keyway waterstop|vapor barrier|vapor retarder|waterproofing membrane|fluid-applied|fluid applied|protection board|drainage board|foundation drain)\b/.test(text)
    ) {
      return "excluded";
    }
  }

  if (!allowsConcrete &&
    /\b(general concrete|cast[-\s]?in[-\s]?place|concrete|slab(?:-on-grade| on grade)?|sog|footings?|rebar|reinforcing|formwork|trench concrete|pit concrete)\b/.test(text) &&
    !/\b(waterproof|waterstop|vapor barrier|vapor retarder|protection board|drainage board|foundation drain)\b/.test(text)
  ) {
    return "excluded";
  }

  if (isBelowGradeWaterproofingOnly) {
    if (/\b(termite treatment|compacted base|compacted aggregate base|aggregate base|base course|slab fill|structural fill|engineered fill|granular fill|stone base)\b/.test(text)) {
      return explicitlyIncludesBaseFill && !explicitlyExcludesGeneralConcrete ? "review" : "excluded";
    }
    if (/\b(rigid insulation|insulation board|perimeter insulation|below[-\s]?grade insulation|foundation insulation)\b/.test(text)) {
      return explicitlyIncludesInsulation ? "review" : "excluded";
    }
  }

  if (/\b(cmu|masonry|masonry veneer|structural steel|eifs|batt insulation|above-grade envelope|plumbing|hvac|electrical|mep)\b/.test(text)) {
    return "excluded";
  }

  if (division && intent.excludedDivisions.includes(division) && !containsAny(text, intent.includeKeywords)) {
    if (intent.needsReviewKeywords.length > 0 && containsAny(text, intent.needsReviewKeywords)) {
      return "review";
    }
    return "excluded";
  }

  if (intent.includeKeywords.length > 0 && containsAny(text, intent.includeKeywords)) {
    return "included";
  }

  if (intent.excludeKeywords.length > 0 && containsAny(text, intent.excludeKeywords)) {
    return "excluded";
  }

  if (division && intent.focusDivisions.length > 0 && !intent.focusDivisions.includes(division)) {
    return "review";
  }

  if (intent.needsReviewKeywords.length > 0 && containsAny(text, intent.needsReviewKeywords)) {
    return "review";
  }

  return intent.includeKeywords.length > 0 ? "review" : "included";
}

export function appendScopeReviewNote(notes: string | null | undefined, status: ScopeMatchStatus): string {
  const base = (notes || "").trim();
  if (status === "included") return base;
  const prefix = status === "excluded" ? "[Scope: excluded]" : "[Scope: review]";
  if (base.startsWith("[Scope:")) return base;
  return `${prefix}${base ? ` ${base}` : ""}`.trim();
}

export function buildScopeIntentPrompt(intent: ScopeIntent, selectedDivisions?: string[] | null): string {
  const lines: string[] = [];

  if (selectedDivisions?.length) {
    lines.push(`Selected CSI divisions: ${selectedDivisions.join(", ")}. Treat these as the user's bid package boundary.`);
  } else {
    lines.push("Selected CSI divisions: all divisions. Use the scope description as the bid package boundary.");
  }

  if (intent.hasScope) {
    lines.push(`Scope description: "${intent.originalText}"`);
    lines.push(`Interpreted scope intent: ${intent.summary}.`);
  }

  if (intent.focusDivisions.length > 0) {
    lines.push(`Likely in-scope divisions: ${intent.focusDivisions.join(", ")}.`);
  }
  if (intent.excludedDivisions.length > 0) {
    lines.push(`Likely excluded divisions: ${intent.excludedDivisions.join(", ")} unless the item is directly tied to the described scope.`);
  }
  if (intent.includeKeywords.length > 0) {
    lines.push(`Strong in-scope signals: ${intent.includeKeywords.slice(0, 20).join(", ")}.`);
  }
  if (intent.excludeKeywords.length > 0) {
    lines.push(`Strong out-of-scope signals: ${intent.excludeKeywords.slice(0, 16).join(", ")}.`);
  }

  lines.push("Classify scope in each item note when scope is provided: start notes with [Scope: included], [Scope: excluded], or [Scope: review].");
  lines.push("Treat [Scope: included] as Included in scope, [Scope: review] as Needs scope review, and [Scope: excluded] as Likely excluded.");
  lines.push("Return clearly included items. Skip clearly excluded items unless they are ambiguous or needed for a contractor to review scope boundaries.");
  lines.push("Use [Scope: review] for interface items such as waterproofing tied to foundations, underslab utilities, dewatering, or cross-division items that may belong to another trade.");

  return lines.join("\n");
}
