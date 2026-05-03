import { getBidModeBehavior, type TakeoffBidMode } from "./bidMode";

export type ScopeMatchStatus = "included" | "excluded" | "review";

export const TRADE_PACKAGE_SCOPE_REVIEW_COST_CENTS = 1_000_000;

type TermFamily =
  | "waterproofing"
  | "foundationDrain"
  | "vaporBarrier"
  | "waterstop"
  | "protectionBoard"
  | "drainageBoard"
  | "belowGradeInsulation"
  | "concrete"
  | "slab"
  | "footing"
  | "rebar"
  | "formwork"
  | "masonry"
  | "structuralSteel"
  | "excavation"
  | "backfill"
  | "compactedBase"
  | "subgradePrep"
  | "controlJoint"
  | "trenchPit"
  | "miscFoundations"
  | "termiteTreatment"
  | "testingCoordination"
  | "supervision"
  | "demo"
  | "patching"
  | "blocking"
  | "equipmentSupport"
  | "sleevesEmbeds"
  | "accessWork"
  | "pipe"
  | "utilityStructure"
  | "roofing"
  | "glazing"
  | "drywall"
  | "framing"
  | "mep"
  | "finishes"
  | "aboveGradeEnvelope";

export interface ScopeIntent {
  bidMode: TakeoffBidMode;
  scopeStrictness: "broad" | "strict" | "review_first";
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
  explicitIncludes: string[];
  explicitExcludes: string[];
  tradeFocus: string[];
  supportWorkAllowed: string[];
  boundaryTerms: string[];
  reviewTerms: string[];
}

export interface ScopeSafetyItem {
  csiDivision?: string | null;
  csiCode?: string | null;
  description?: string | null;
  notes?: string | null;
  quantity?: number | string | null;
  unit?: string | null;
  unitCost?: number | string | null;
  extendedCost?: number | string | null;
  confidence?: number | string | null;
}

interface TradeProfile {
  id: string;
  patterns: RegExp[];
  summary: string;
  focusDivisions: string[];
  excludedDivisions: string[];
  includedFamilies: TermFamily[];
  excludedFamilies: TermFamily[];
  reviewFamilies: TermFamily[];
  supportFamilies: TermFamily[];
}

const TERM_PATTERNS: Record<TermFamily, RegExp[]> = {
  waterproofing: [/\bwaterproof(?:ing)?\b/i, /\bdampproof(?:ing)?\b/i, /\bdamp proof\b/i, /\bmembrane\b/i, /\bfluid[-\s]?applied\b/i, /\bbentonite\b/i, /\bsealant\b/i],
  foundationDrain: [/\bfoundation drains?\b/i, /\bdrain(?:age)? pipe\b/i, /\bperimeter drains?\b/i, /\bdrainage\b/i],
  vaporBarrier: [/\bvapor barriers?\b/i, /\bvapor retarders?\b/i],
  waterstop: [/\bwaterstops?\b/i, /\bkeyway waterstops?\b/i],
  protectionBoard: [/\bprotection boards?\b/i],
  drainageBoard: [/\bdrainage boards?\b/i],
  belowGradeInsulation: [/\brigid insulation\b/i, /\binsulation board\b/i, /\bbelow[-\s]?grade insulation\b/i, /\bfoundation insulation\b/i, /\bperimeter insulation\b/i],
  concrete: [/\bconcrete\b/i, /\bcast[-\s]?in[-\s]?place\b/i, /\bpit concrete\b/i, /\btrench concrete\b/i, /\bcar wash trench\b/i],
  slab: [/\bslabs?\b/i, /\bslab(?:-on-grade| on grade)?\b/i, /\bsog\b/i],
  footing: [/\bfootings?\b/i, /\bcontinuous footings?\b/i, /\bspread footings?\b/i, /\bwall footings?\b/i, /\bwf footing\b/i, /\bgrade beams?\b/i, /\bfoundation walls?\b/i],
  rebar: [/\brebar\b/i, /\breinforc(?:e|ing|ement)?\b/i, /\breinforcing steel\b/i, /\bstructural reinforcing\b/i],
  formwork: [/\bforms?\b/i, /\bformwork\b/i],
  masonry: [/\bcmu\b/i, /\bmasonry\b/i, /\bblock\b/i, /\bbrick\b/i],
  structuralSteel: [/\bstructural steel\b/i, /\bsteel beams?\b/i, /\bsteel columns?\b/i],
  excavation: [/\bexcavat(?:e|ion|ing)\b/i, /\bearthwork\b/i, /\bspoils?\b/i],
  backfill: [/\bbackfill(?:ing)?\b/i],
  compactedBase: [/\bcompacted base\b/i, /\bcompacted aggregate base\b/i, /\baggregate base\b/i, /\bbase course\b/i, /\bslab fill\b/i, /\bstructural fill\b/i, /\bengineered fill\b/i, /\bgranular fill\b/i, /\bstone base\b/i, /\bcompaction\b/i],
  subgradePrep: [/\bsubgrade\b/i, /\bfine grading\b/i, /\bsite preparation\b/i, /\bproof[-\s]?roll(?:ing)?\b/i],
  controlJoint: [/\bcontrol joints?\b/i, /\bsaw ?cuts?\b/i, /\bsawcut(?:ting)?\b/i],
  trenchPit: [/\btrench pits?\b/i, /\btrench drains?\b/i, /\btire seal(?: drainage)? pit\b/i, /\bcorrelator pits?\b/i, /\bspecialty pits?\b/i, /\bcar wash trench\b/i],
  miscFoundations: [/\bgate post foundations?\b/i, /\bbollard foundations?\b/i, /\bequipment pole foundations?\b/i, /\bvacuum enclosure foundations?\b/i, /\btrash enclosure foundations?\b/i, /\benclosure foundations?\b/i, /\bmisc(?:ellaneous)? foundations?\b/i],
  termiteTreatment: [/\btermite treatment\b/i, /\btermite\b/i],
  testingCoordination: [/\btesting coordination\b/i, /\bconcrete testing\b/i, /\bcompaction testing\b/i, /\btesting\b/i],
  supervision: [/\bsupervision\b/i, /\bproject management\b/i, /\bfield supervision\b/i, /\bmobilization\b/i, /\blayout coordination\b/i],
  demo: [/\bdemo(?:lition)?\b/i, /\bremove and dispose\b/i],
  patching: [/\bpatch(?:ing)?\b/i, /\brepair patch\b/i],
  blocking: [/\bblocking\b/i, /\bbacking\b/i],
  equipmentSupport: [/\bequipment supports?\b/i, /\bequipment pads?\b/i, /\bpole foundations?\b/i, /\bequipment pole foundations?\b/i],
  sleevesEmbeds: [/\bsleeves?\b/i, /\bembeds?\b/i, /\banchor bolts?\b/i, /\binserts?\b/i],
  accessWork: [/\baccess work\b/i, /\bscaffold(?:ing)?\b/i, /\blifts?\b/i],
  pipe: [/\bpipes?\b/i, /\bstorm\b/i, /\bsanitary\b/i, /\bsewer\b/i, /\bwater service\b/i, /\butility\b/i],
  utilityStructure: [/\bmanholes?\b/i, /\bcatch basins?\b/i, /\bcleanouts?\b/i, /\btie[-\s]?ins?\b/i],
  roofing: [/\broofs?\b/i, /\broofing\b/i, /\btpo\b/i, /\bepdm\b/i, /\bpvc roof\b/i, /\broof membrane\b/i, /\broof flashing\b/i],
  glazing: [/\bglazing\b/i, /\bstorefront\b/i, /\bcurtain wall\b/i, /\bwindows?\b/i, /\bglass\b/i],
  drywall: [/\bdrywall\b/i, /\bgypsum\b/i, /\bgyp board\b/i],
  framing: [/\bframing\b/i, /\bstuds?\b/i, /\bmetal studs?\b/i, /\bwood framing\b/i],
  mep: [/\bmep\b/i, /\bplumbing\b/i, /\bhvac\b/i, /\belectrical\b/i, /\bconduit\b/i, /\bductwork\b/i, /\bfixtures?\b/i],
  finishes: [/\bfinishes?\b/i, /\bpaint\b/i, /\bflooring\b/i, /\btile\b/i, /\bceiling\b/i],
  aboveGradeEnvelope: [/\babove[-\s]?grade envelope\b/i, /\beifs\b/i, /\bsiding\b/i, /\bveneer\b/i, /\bbatt insulation\b/i],
};

const SUPPORT_FAMILIES: TermFamily[] = [
  "excavation", "backfill", "compactedBase", "subgradePrep", "formwork", "rebar", "demo",
  "patching", "blocking", "equipmentSupport", "sleevesEmbeds", "accessWork",
];

const BOUNDARY_FAMILY_PATTERNS: Array<{ family: TermFamily; pattern: RegExp }> = [
  { family: "footing", pattern: /\bat\s+foundation walls?\b|\bfoundation walls?\b/i },
  { family: "concrete", pattern: /\bat\s+trench pits?\b|\btrench pits?\b|\bcorrelator pits?\b|\bat\s+pits?\b/i },
  { family: "slab", pattern: /\bat\s+slab conditions?\b|\bslab conditions?\b/i },
];

const TRADE_PROFILES: TradeProfile[] = [
  {
    id: "concrete_foundations_sog_pits_drains",
    patterns: [
      /concrete foundations?.*slab[-\s]?on[-\s]?grade.*trench\/?pit.*drains?/i,
      /concrete foundations?.*slab[-\s]?on[-\s]?grade.*pits?.*drains?/i,
      /foundations?.*slab[-\s]?on[-\s]?grade.*trench.*pits?.*drains?/i,
      /trench\/pit systems?.*drains? package/i,
      /foundations?.*trench drains?.*correlator pit/i,
    ],
    summary: "Concrete foundations, slab-on-grade, trench/pit systems, and drains package",
    focusDivisions: ["03", "07", "31", "32", "33"],
    excludedDivisions: ["04", "05", "06", "08", "09", "10", "11", "12", "13", "14", "21", "22", "23", "26", "27", "28"],
    includedFamilies: [
      "concrete", "slab", "footing", "rebar", "formwork", "excavation", "backfill",
      "compactedBase", "subgradePrep", "vaporBarrier", "belowGradeInsulation", "pipe",
      "utilityStructure", "foundationDrain", "trenchPit", "miscFoundations", "termiteTreatment",
      "testingCoordination", "supervision", "controlJoint", "equipmentSupport",
    ],
    excludedFamilies: ["masonry", "structuralSteel", "roofing", "glazing", "drywall", "framing", "mep", "finishes", "aboveGradeEnvelope"],
    reviewFamilies: ["waterproofing", "protectionBoard", "drainageBoard", "waterstop", "sleevesEmbeds", "accessWork", "patching", "demo"],
    supportFamilies: [],
  },
  {
    id: "underground_concrete_below_grade_waterproofing",
    patterns: [
      /underground.*concrete.*below[-\s]?grade.*waterproof/i,
      /below[-\s]?grade.*waterproof.*underground.*concrete/i,
      /trench.*concrete.*below[-\s]?grade.*waterproof/i,
      /below[-\s]?grade.*waterproof.*trench.*concrete/i,
    ],
    summary: "Underground concrete plus below-grade waterproofing",
    focusDivisions: ["03", "07", "31", "33"],
    excludedDivisions: ["04", "05", "06", "08", "09", "10", "11", "12", "13", "14", "21", "22", "23", "26", "27", "28", "32"],
    includedFamilies: ["concrete", "footing", "rebar", "formwork", "waterproofing", "protectionBoard", "waterstop", "vaporBarrier", "foundationDrain", "drainageBoard", "excavation", "backfill"],
    excludedFamilies: ["masonry", "structuralSteel", "roofing", "glazing", "drywall", "framing", "mep", "finishes", "aboveGradeEnvelope"],
    reviewFamilies: ["belowGradeInsulation", "compactedBase", "sleevesEmbeds", "patching"],
    supportFamilies: ["demo", "patching", "equipmentSupport", "sleevesEmbeds", "accessWork"],
  },
  {
    id: "below_grade_waterproofing",
    patterns: [/below[-\s]?grade.*waterproof/i, /waterproof.*below[-\s]?grade/i, /dampproof/i, /waterproofing/i],
    summary: "Below-grade waterproofing and drainage at foundation/trench conditions",
    focusDivisions: ["07", "31", "33"],
    excludedDivisions: ["03", "04", "05", "06", "08", "09", "10", "11", "12", "13", "14", "21", "22", "23", "26", "27", "28", "32"],
    includedFamilies: ["waterproofing", "protectionBoard", "waterstop", "vaporBarrier", "foundationDrain", "drainageBoard"],
    excludedFamilies: ["concrete", "slab", "footing", "rebar", "formwork", "masonry", "structuralSteel", "roofing", "glazing", "drywall", "framing", "mep", "finishes", "aboveGradeEnvelope", "belowGradeInsulation", "termiteTreatment", "controlJoint"],
    reviewFamilies: ["sleevesEmbeds", "patching"],
    supportFamilies: ["excavation", "backfill", "compactedBase", "formwork", "rebar", "demo", "equipmentSupport", "accessWork"],
  },
  {
    id: "piles_deep_foundations",
    patterns: [/\bpiles?\b/i, /\bcaissons?\b/i, /\bdrilled piers?\b/i, /\bdeep foundations?\b/i, /\bhelical\b/i],
    summary: "Piles, piers, and deep foundation work",
    focusDivisions: ["03", "31"],
    excludedDivisions: ["04", "05", "06", "07", "08", "09", "10", "11", "12", "13", "14", "21", "22", "23", "26", "27", "28", "32", "33"],
    includedFamilies: ["footing", "concrete"],
    excludedFamilies: ["masonry", "structuralSteel", "roofing", "drywall", "framing", "mep", "finishes"],
    reviewFamilies: ["excavation", "backfill", "rebar", "formwork", "compactedBase"],
    supportFamilies: ["excavation", "backfill", "rebar", "formwork", "demo", "patching", "sleevesEmbeds", "accessWork"],
  },
  {
    id: "foundations",
    patterns: [/\bfoundations?\s+(?:only|concrete|walls?|work|package|scope)\b/i, /\bfootings?\b/i, /\bgrade beams?\b/i, /\bslab(?:-on-grade| on grade)?\b/i, /\bsog\b/i],
    summary: "Foundations, footings, slabs-on-grade, and directly related concrete work",
    focusDivisions: ["03", "07", "31"],
    excludedDivisions: ["04", "05", "06", "08", "09", "10", "11", "12", "13", "14", "21", "22", "23", "26", "27", "28", "33"],
    includedFamilies: ["concrete", "slab", "footing", "rebar", "formwork", "vaporBarrier", "waterstop"],
    excludedFamilies: ["masonry", "structuralSteel", "roofing", "glazing", "drywall", "framing", "mep", "finishes"],
    reviewFamilies: ["waterproofing", "foundationDrain", "excavation", "backfill", "compactedBase", "belowGradeInsulation"],
    supportFamilies: ["excavation", "backfill", "compactedBase", "demo", "patching", "sleevesEmbeds", "accessWork"],
  },
  {
    id: "site_utilities",
    patterns: [/site utilit/i, /\bstorm\b/i, /\bsanitary\b/i, /\bsewer\b/i, /\bwater service\b/i],
    summary: "Site utilities and utility trenching",
    focusDivisions: ["31", "33"],
    excludedDivisions: ["03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13", "14", "21", "22", "23", "26", "27", "28", "32"],
    includedFamilies: ["pipe", "utilityStructure", "excavation", "backfill"],
    excludedFamilies: ["concrete", "slab", "footing", "masonry", "structuralSteel", "roofing", "glazing", "drywall", "framing", "mep", "finishes"],
    reviewFamilies: ["compactedBase", "sleevesEmbeds", "patching"],
    supportFamilies: ["demo", "patching", "accessWork", "equipmentSupport"],
  },
  {
    id: "roofing",
    patterns: [/\broofing\b/i, /\broof\b/i, /\btpo\b/i, /\bepdm\b/i],
    summary: "Roofing and roof membrane scope",
    focusDivisions: ["07"],
    excludedDivisions: ["03", "04", "05", "06", "08", "09", "21", "22", "23", "26", "31", "32", "33"],
    includedFamilies: ["roofing"],
    excludedFamilies: ["concrete", "slab", "footing", "rebar", "formwork", "masonry", "glazing", "drywall", "framing", "mep"],
    reviewFamilies: ["belowGradeInsulation", "sleevesEmbeds", "patching"],
    supportFamilies: ["demo", "blocking", "equipmentSupport", "accessWork"],
  },
  {
    id: "glazing",
    patterns: [/\bglazing\b/i, /\bstorefront\b/i, /\bcurtain wall\b/i, /\bwindows?\b/i],
    summary: "Glazing, storefront, and curtain wall scope",
    focusDivisions: ["08"],
    excludedDivisions: ["03", "04", "05", "06", "07", "09", "21", "22", "23", "26", "31", "32", "33"],
    includedFamilies: ["glazing"],
    excludedFamilies: ["concrete", "slab", "footing", "rebar", "formwork", "masonry", "roofing", "drywall", "framing", "mep"],
    reviewFamilies: ["blocking", "sleevesEmbeds", "patching"],
    supportFamilies: ["blocking", "demo", "equipmentSupport", "accessWork"],
  },
  {
    id: "drywall_framing",
    patterns: [/\bdrywall\b/i, /\bgypsum\b/i, /\bframing\b/i, /\bmetal studs?\b/i],
    summary: "Drywall and framing scope",
    focusDivisions: ["06", "09"],
    excludedDivisions: ["03", "04", "05", "07", "08", "21", "22", "23", "26", "31", "32", "33"],
    includedFamilies: ["drywall", "framing"],
    excludedFamilies: ["concrete", "slab", "footing", "rebar", "formwork", "masonry", "structuralSteel", "roofing", "glazing", "mep"],
    reviewFamilies: ["blocking", "sleevesEmbeds", "patching", "accessWork"],
    supportFamilies: ["blocking", "demo", "patching", "equipmentSupport", "accessWork"],
  },
  {
    id: "mep_partial_scope",
    patterns: [/\bmep\b/i, /\bplumbing\b/i, /\bhvac\b/i, /\belectrical\b/i, /\bpartial\s+mep\b/i],
    summary: "MEP partial scope",
    focusDivisions: ["21", "22", "23", "26", "27", "28"],
    excludedDivisions: ["03", "04", "05", "06", "07", "08", "09", "31", "32", "33"],
    includedFamilies: ["mep"],
    excludedFamilies: ["concrete", "slab", "footing", "rebar", "formwork", "masonry", "structuralSteel", "roofing", "glazing", "drywall", "framing"],
    reviewFamilies: ["sleevesEmbeds", "patching", "blocking", "accessWork"],
    supportFamilies: ["sleevesEmbeds", "patching", "blocking", "demo", "accessWork"],
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

function familyMatches(text: string, family: TermFamily): boolean {
  return TERM_PATTERNS[family].some((pattern) => pattern.test(text));
}

function matchingFamilies(text: string): TermFamily[] {
  return (Object.keys(TERM_PATTERNS) as TermFamily[]).filter((family) => familyMatches(text, family));
}

function containsFamily(families: string[], family: TermFamily): boolean {
  return families.includes(family);
}

function containsAnyFamily(text: string, families: TermFamily[]): boolean {
  return families.some((family) => familyMatches(text, family));
}

function extractFamiliesFromClauses(text: string, marker: RegExp): TermFamily[] {
  const families: TermFamily[] = [];
  for (const sentence of text.split(/[.;]/)) {
    const match = sentence.match(marker);
    if (!match || match.index === undefined) continue;
    families.push(...matchingFamilies(sentence.slice(match.index + match[0].length)));
  }
  return families;
}

function parseExplicitIncludes(text: string): TermFamily[] {
  const includeFamilies = [
    ...extractFamiliesFromClauses(text, /\binclude(?:s|d|ing)?\b/i),
    ...extractFamiliesFromClauses(text, /\bwith\b/i),
    ...extractFamiliesFromClauses(text, /\bbidder\s+(?:owns|includes|provides)\b/i),
    ...extractFamiliesFromClauses(text, /\b(?:scope|package)\s+includes\b/i),
  ];
  return unique(includeFamilies) as TermFamily[];
}

function parseExplicitExcludes(text: string): TermFamily[] {
  const excludeFamilies = [
    ...extractFamiliesFromClauses(text, /\bexclude(?:s|d|ing)?\b/i),
    ...extractFamiliesFromClauses(text, /\bno\b/i),
    ...extractFamiliesFromClauses(text, /\bnot\s+including\b/i),
  ];
  return unique(excludeFamilies) as TermFamily[];
}

function supportFamiliesAllowed(text: string, explicitIncludes: TermFamily[]): TermFamily[] {
  const ownsSupport = /\b(?:bidder\s+owns?|this\s+trade\s+owns?|scope\s+owns?|provide|provided by bidder|by this trade|responsible for)\b[^.]*\b(excavation|backfill|compacted base|base course|formwork|rebar|reinforcing|demo|patching|blocking|equipment supports?|sleeves?|embeds?|access work)\b/i.test(text);
  if (!ownsSupport) return [];
  return explicitIncludes.filter((family) => SUPPORT_FAMILIES.includes(family));
}

function boundaryTerms(text: string): string[] {
  return unique(BOUNDARY_FAMILY_PATTERNS.filter(({ pattern }) => pattern.test(text)).map(({ family }) => family));
}

function hasQuantityReviewSignal(text: string): boolean {
  return /\bneeds?\s+qty\b|\bmissing\s+qty\b|\bquantity\s+(?:set|kept)\s+to\s+1\b|\bplaceholder\b|\bcannot\s+be\s+verified\b|\bupdate(?:d)?\s+with\s+actual\b|\bfield\s+verify\b/i.test(text);
}

function numeric(value: number | string | null | undefined): number {
  const result = Number(value || 0);
  return Number.isFinite(result) ? result : 0;
}

function hasNamedIncludedWorkArea(text: string): boolean {
  return [
    /\bcontinuous footings?\b/i,
    /\bisolated footings?\b/i,
    /\bspread footings?\b/i,
    /\btrench drains?\b/i,
    /\btrench pits?\b/i,
    /\btire seal(?: drainage)? pits?\b/i,
    /\bcorrelator pits?\b/i,
    /\bgate post foundations?\b/i,
    /\bbollard foundations?\b/i,
    /\bequipment pole foundations?\b/i,
    /\bvacuum enclosure (?:foundations?|slabs?)\b/i,
    /\btrash enclosure (?:foundations?|slabs?)\b/i,
    /\bdumpster enclosure (?:foundations?|slabs?)\b/i,
    /\bslab[-\s]?on[-\s]?grade\b/i,
    /\bsog\b/i,
    /\bbuilding footprint\b/i,
    /\boccupied slab perimeter\b/i,
    /\b10 mil vapor barrier\b/i,
    /\bvapor barriers?\b/i,
    /\brigid insulation\b/i,
    /\btermite treatment\b/i,
  ].some((pattern) => pattern.test(text));
}

function hasBroadAssemblyOnly(text: string): boolean {
  if (hasNamedIncludedWorkArea(text)) return false;
  return /\b(?:generic|typ(?:ical)?|general|related)\b.*\b(?:concrete|slabs?|foundations?|formwork|reinforc(?:ing|ement)?|rebar)\b/i.test(text) ||
    /\b(?:concrete|slabs?|foundations?|formwork|reinforc(?:ing|ement)?|rebar|control joints?|sawcuts?)\b/i.test(text);
}

function hasWeakSheetEvidence(text: string): boolean {
  return /\b(?:no specific quantity|assuming|placeholder|quantity set to 1|original quantity was 0|missing item|typical detail|not provided|cannot be verified|field verify|update with actual|visually estimating)\b/i.test(text);
}

function isGeneratedOrConsolidated(text: string): boolean {
  return /\[(?:generated|enhanced|consolidated|fuzzy-merged|merged|ls.)|\b(?:generated|consolidated|fuzzy-merged|unit resolved from cost library)\b/i.test(text);
}

function isObviousRepeatedAssembly(text: string): boolean {
  return /\b(?:sections?\s+\d|typ(?:ical)?|each side|at .*faces|from:\s*[^]]*,\s*[^]]*,|consolidated \d+ items)\b/i.test(text);
}

function matchesExplicitExcludedPhrase(itemText: string, scopeText: string): boolean {
  if (/\b(?:control joint sealants?|joint sealants?|epoxy fillers?|joint caulking|caulking)\b/i.test(scopeText)) {
    if (/\b(?:sealants?|caulking|epoxy fillers?)\b/i.test(itemText)) return true;
  }
  if (/\bdewatering\b/i.test(scopeText) && /\bdewatering\b/i.test(itemText)) return true;
  if (/\bsurveying(?:\s+services)?\b/i.test(scopeText) && /\bsurvey(?:ing)?\b/i.test(itemText)) return true;
  if (/\bimport\/export of fill\b|\bimport\s+or\s+export of fill\b|\bexport of fill\b|\bimport of fill\b/i.test(scopeText)) {
    if (/\bimport\b|\bexport\b|\boff[-\s]?site haul\b|\bhaul[-\s]?off\b/i.test(itemText)) return true;
  }
  if (/\b(?:beyond foundation scope|beyond included pits and drains|beyond included pits|beyond onsite reuse|outside the building footprint)\b/i.test(itemText)) {
    return true;
  }
  return false;
}

function noScopeIntent(selectedDivisions?: string[] | null, bidMode?: TakeoffBidMode | string | null): ScopeIntent {
  const behavior = getBidModeBehavior(bidMode);
  return {
    bidMode: behavior.bidMode,
    scopeStrictness: behavior.scopeStrictness,
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
    explicitIncludes: [],
    explicitExcludes: [],
    tradeFocus: [],
    supportWorkAllowed: [],
    boundaryTerms: [],
    reviewTerms: [],
  };
}

export function buildScopeIntent(scopeText?: string | null, selectedDivisions?: string[] | null, bidMode?: TakeoffBidMode | string | null): ScopeIntent {
  const behavior = getBidModeBehavior(bidMode);
  const originalText = (scopeText || "").trim();
  if (!originalText || behavior.scopeStrictness === "broad") {
    return {
      ...noScopeIntent(selectedDivisions, behavior.bidMode),
      originalText,
      normalizedText: originalText.toLowerCase(),
      summary: behavior.scopeStrictness === "broad" ? "Full GC broad coverage" : "Full drawing set",
    };
  }

  const normalizedText = originalText.toLowerCase();
  const explicitIncludes = parseExplicitIncludes(normalizedText);
  const explicitExcludes = parseExplicitExcludes(normalizedText);
  const supportWorkAllowed = supportFamiliesAllowed(normalizedText, explicitIncludes);
  const matched = TRADE_PROFILES.filter((profile) => profile.patterns.some((pattern) => pattern.test(originalText)));
  const filteredMatched = matched.filter((profile) => {
    const profileFamilies = unique([...profile.includedFamilies, ...profile.reviewFamilies]) as TermFamily[];
    const hasIncludedProfileSignal = profileFamilies.some((family) => explicitIncludes.includes(family));
    const hasOnlyExcludedProfileSignal = profileFamilies.some((family) => explicitExcludes.includes(family)) && !hasIncludedProfileSignal;
    const concreteAssemblyFamilies: TermFamily[] = ["concrete", "slab", "footing", "rebar", "formwork"];
    const concreteAssemblyExplicitlyIncluded = concreteAssemblyFamilies.some((family) => explicitIncludes.includes(family));
    const concreteAssemblyExplicitlyExcluded = concreteAssemblyFamilies.some((family) => explicitExcludes.includes(family));
    if (concreteAssemblyExplicitlyExcluded && !concreteAssemblyExplicitlyIncluded && ["underground_concrete_below_grade_waterproofing", "foundations", "piles_deep_foundations"].includes(profile.id)) {
      return false;
    }
    return !hasOnlyExcludedProfileSignal;
  });
  const focusDivisions = unique([
    ...(selectedDivisions || []),
    ...filteredMatched.flatMap((profile) => profile.focusDivisions),
  ]);
  const excludedDivisions = unique([
    ...filteredMatched.flatMap((profile) => profile.excludedDivisions || []),
    ...GENERIC_EXCLUDE_PATTERNS
      .filter(({ pattern }) => pattern.test(originalText))
      .flatMap(({ divisions }) => divisions),
  ].filter((division) => !focusDivisions.includes(division)));
  const includeFamilies = unique([
    ...filteredMatched.flatMap((profile) => profile.includedFamilies),
    ...explicitIncludes,
  ]);
  const excludeFamilies = unique([
    ...filteredMatched.flatMap((profile) => profile.excludedFamilies),
    ...explicitExcludes,
  ]);
  const reviewFamilies = unique([
    ...filteredMatched.flatMap((profile) => profile.reviewFamilies),
    ...filteredMatched.flatMap((profile) => profile.supportFamilies),
  ]);

  return {
    bidMode: behavior.bidMode,
    scopeStrictness: behavior.scopeStrictness,
    hasScope: true,
    originalText,
    normalizedText,
    summary: filteredMatched.length > 0 ? filteredMatched.map((profile) => profile.summary).join("; ") : "Custom contractor scope",
    presetIds: filteredMatched.map((profile) => profile.id),
    includeKeywords: includeFamilies,
    excludeKeywords: excludeFamilies,
    needsReviewKeywords: reviewFamilies,
    focusDivisions,
    excludedDivisions,
    explicitIncludes,
    explicitExcludes,
    tradeFocus: filteredMatched.map((profile) => profile.id),
    supportWorkAllowed,
    boundaryTerms: boundaryTerms(normalizedText),
    reviewTerms: reviewFamilies,
  };
}

export function classifyScopeMatch(
  item: { csiDivision?: string | null; csiCode?: string | null; description?: string | null; notes?: string | null },
  intent: ScopeIntent
): ScopeMatchStatus {
  if (intent.scopeStrictness === "broad" || !intent.hasScope) return "included";

  const division = (item.csiDivision || item.csiCode?.slice(0, 2) || "").trim();
  const text = `${item.description || ""} ${item.notes || ""}`.toLowerCase();
  const profiles = TRADE_PROFILES.filter((profile) => intent.presetIds.includes(profile.id));
  const families = matchingFamilies(text);
  const hasBroadConcretePackageProfile = profiles.some((profile) => profile.id === "concrete_foundations_sog_pits_drains");
  const hasExplicitInclude = families.some((family) => containsFamily(intent.explicitIncludes, family));
  const hasExplicitExclude = families.some((family) => containsFamily(intent.explicitExcludes, family));
  const supportFamilies = families.filter((family) => SUPPORT_FAMILIES.includes(family));
  const hasProfileIncludedSupport = supportFamilies.some((family) =>
    profiles.some((profile) => profile.includedFamilies.includes(family))
  );
  const hasUnownedSupport = supportFamilies.some((family) => !containsFamily(intent.supportWorkAllowed, family)) && !hasProfileIncludedSupport;
  const hasProfileInclude = profiles.some((profile) => containsAnyFamily(text, profile.includedFamilies));
  const hasProfileReview = profiles.some((profile) => containsAnyFamily(text, profile.reviewFamilies));
  const hasProfileExclude = profiles.some((profile) => containsAnyFamily(text, profile.excludedFamilies));
  const hasHardExcludedFamily = families.some((family) =>
    ["roofing", "glazing", "drywall", "framing", "mep", "finishes", "aboveGradeEnvelope", "masonry", "structuralSteel"].includes(family)
  );
  const hasUnincludedHardExcludedFamily = families.some((family) =>
    ["roofing", "glazing", "drywall", "framing", "mep", "finishes", "aboveGradeEnvelope", "masonry", "structuralSteel"].includes(family) &&
    !containsFamily(intent.explicitIncludes, family)
  );
  const hasProtectiveExplicitInclude = families.some((family) =>
    ["waterproofing", "foundationDrain", "vaporBarrier", "waterstop", "protectionBoard", "drainageBoard"].includes(family) &&
    containsFamily(intent.explicitIncludes, family)
  );

  const quantityNeedsReview = hasQuantityReviewSignal(text);

  if (matchesExplicitExcludedPhrase(text, intent.normalizedText)) return "excluded";
  if (hasExplicitExclude && !(hasBroadConcretePackageProfile && hasProfileInclude) && !hasProtectiveExplicitInclude) return "excluded";
  if (hasExplicitExclude && !hasExplicitInclude) return "excluded";
  if (hasProfileExclude && hasUnincludedHardExcludedFamily) {
    return intent.scopeStrictness === "review_first" ? "review" : "excluded";
  }

  if (hasExplicitInclude) {
    if (hasUnownedSupport) return "review";
    if (quantityNeedsReview) return "review";
    if (families.includes("belowGradeInsulation") && !hasProfileInclude) return "review";
    if (hasProfileInclude) return "included";
    if (hasProfileExclude && hasHardExcludedFamily) return "review";
    if (hasProfileExclude) return "included";
    if (hasProfileReview) return "review";
    return "included";
  }

  if (hasUnownedSupport) {
    if (hasProfileExclude && !hasProfileInclude) return intent.scopeStrictness === "review_first" ? "review" : "excluded";
    return "review";
  }

  if (hasProfileExclude && hasHardExcludedFamily) {
    return intent.scopeStrictness === "review_first" ? "review" : "excluded";
  }

  if (hasProfileInclude) {
    if (quantityNeedsReview) return "review";
    return "included";
  }

  if (hasProfileExclude) {
    return intent.scopeStrictness === "review_first" ? "review" : "excluded";
  }

  if (hasProfileReview) {
    return "review";
  }

  if (division && intent.excludedDivisions.includes(division)) {
    return intent.scopeStrictness === "review_first" ? "review" : "excluded";
  }

  if (division && intent.focusDivisions.length > 0 && !intent.focusDivisions.includes(division)) {
    return "review";
  }

  return intent.includeKeywords.length > 0 ? "review" : "included";
}

export function classifyTradePackageScopeSafety(
  item: ScopeSafetyItem,
  intent: ScopeIntent,
  currentStatus: ScopeMatchStatus = classifyScopeMatch(item, intent)
): ScopeMatchStatus {
  if (currentStatus !== "included") return currentStatus;
  if (intent.bidMode !== "trade_package" || intent.scopeStrictness !== "strict" || !intent.hasScope) return currentStatus;

  const text = `${item.description || ""} ${item.notes || ""}`.toLowerCase();
  const extendedCost = numeric(item.extendedCost);
  const isHighDollar = extendedCost >= TRADE_PACKAGE_SCOPE_REVIEW_COST_CENTS;
  const generatedOrConsolidated = isGeneratedOrConsolidated(text);
  const weakEvidence = hasWeakSheetEvidence(text);
  const broadOnly = hasBroadAssemblyOnly(text);
  const repeatedAssembly = isObviousRepeatedAssembly(text);
  const namedAnchor = hasNamedIncludedWorkArea(text);
  const highDollarControlJoint = isHighDollar && /\b(?:sawcuts?|control joints?)\b/i.test(text);

  if (highDollarControlJoint) return "review";
  if (weakEvidence) return "review";
  if (broadOnly) return "review";
  if (generatedOrConsolidated && !namedAnchor) return "review";
  if (isHighDollar && (generatedOrConsolidated || repeatedAssembly) && (!namedAnchor || weakEvidence)) return "review";
  if (isHighDollar && broadOnly) return "review";

  return currentStatus;
}

export function appendScopeReviewNote(notes: string | null | undefined, status: ScopeMatchStatus): string {
  const base = (notes || "").trim();
  if (status === "included") return base;
  const prefix = status === "excluded" ? "[Scope: excluded]" : "[Scope: review]";
  if (base.startsWith(prefix)) return base;
  if (status === "review" && base.startsWith("[Scope: excluded]")) return base;
  if (base.startsWith("[Scope:")) return base.replace(/^\[Scope: (?:included|review|excluded)\]\s*/, `${prefix} `).trim();
  return `${prefix}${base ? ` ${base}` : ""}`.trim();
}

export function buildScopeIntentPrompt(intent: ScopeIntent, selectedDivisions?: string[] | null): string {
  const lines: string[] = [];
  const behavior = getBidModeBehavior(intent.bidMode);

  lines.push(`Bid mode: ${behavior.label}. ${behavior.reviewSurface}`);

  if (behavior.scopeStrictness === "broad") {
    lines.push("Extraction stance: broad GC coverage. Do not narrow the takeoff to a specialty package unless CSI divisions are explicitly selected.");
  } else if (behavior.scopeStrictness === "review_first") {
    lines.push("Extraction stance: speed-first scope check. Prioritize likely scope and risk items; place uncertain boundary work in [Scope: review] instead of counting it.");
  } else {
    lines.push("Extraction stance: trade package. Apply strict bid boundaries; active totals should include only the bidder's likely owned work.");
  }

  if (selectedDivisions?.length) {
    lines.push(`Selected CSI divisions: ${selectedDivisions.join(", ")}. Treat these as the user's bid package boundary.`);
  } else {
    lines.push("Selected CSI divisions: all divisions. Use the scope description as the bid package boundary.");
  }

  if (intent.hasScope) {
    lines.push(`Scope description: "${intent.originalText}"`);
    lines.push(`Interpreted scope intent: ${intent.summary}.`);
  }

  if (intent.tradeFocus.length > 0) {
    lines.push(`Trade focus profiles: ${intent.tradeFocus.join(", ")}.`);
  }
  if (intent.explicitIncludes.length > 0) {
    lines.push(`Explicitly included item families: ${intent.explicitIncludes.join(", ")}.`);
  }
  if (intent.explicitExcludes.length > 0) {
    lines.push(`Explicitly excluded item families: ${intent.explicitExcludes.join(", ")}. These override adjacent or inferred includes.`);
  }
  if (intent.supportWorkAllowed.length > 0) {
    lines.push(`Support work explicitly owned by bidder: ${intent.supportWorkAllowed.join(", ")}.`);
  }
  if (intent.focusDivisions.length > 0) {
    lines.push(`Likely in-scope divisions: ${intent.focusDivisions.join(", ")}.`);
  }
  if (intent.excludedDivisions.length > 0) {
    lines.push(`Likely excluded divisions: ${intent.excludedDivisions.join(", ")} unless the item is explicitly included by the scope text.`);
  }

  lines.push("Classify scope in each item note when scope is provided: start notes with [Scope: included], [Scope: excluded], or [Scope: review].");
  lines.push("Treat [Scope: included] as counted, [Scope: review] as visible but held out of totals until accepted, and [Scope: excluded] as likely out of scope.");
  lines.push("Adjacent condition terms such as at trench pits, at slab conditions, or at foundation walls do not include full concrete/rebar/slab/footing assemblies unless the scope explicitly says the bidder owns them.");
  lines.push("Support work such as excavation, backfill, compacted base, formwork, rebar, demo, patching, blocking, equipment supports, sleeves, embeds, and access work defaults to [Scope: review] unless explicitly included.");

  return lines.join("\n");
}
