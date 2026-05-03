import { getBidModeBehavior, type TakeoffBidMode } from "./bidMode";
import { getScopeStatusFromNotes } from "./scopeCost";

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
  rebar: [/\brebar\b/i, /\breinforc(?:e|ing|ement)?\b/i, /\breinforcing steel\b/i, /\bstructural reinforcing\b/i, /\bdowels?\b/i],
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

/**
 * Named-area patterns for the broad concrete profile.
 * Only items matching one of these specific assemblies should be classified as 'active'
 * when the concrete_foundations_sog_pits_drains profile is matched.
 * Generic slab/wall/concrete/broad rebar/broad formwork without a named-area tie → review.
 */
const NAMED_AREA_PATTERNS: RegExp[] = [
  /\bcontinuous footing/i,
  /\bisolated footing/i,
  /\bspread footing/i,
  /\btrench drain/i,
  /\btrench pit/i,
  /\btire seal(?:\s+drainage)?\s*pit/i,
  /\bcorrelator pit/i,
  /\bgate post foundation/i,
  /\bbollard foundation/i,
  /\bequipment pole foundation/i,
  /\bvacuum enclosure/i,
  /\btrash enclosure/i,
  /\bslab[- ]?on[- ]?grade\b.*\b(?:building|footprint|interior|enclosed)/i,
  /\binterior slab/i,
  /\bbuilding slab/i,
  /\bvapor barrier/i,
  /\bvapor retarder/i,
  /\brigid insulation/i,
  /\btermite treatment/i,
  /\btermite/i,
  /\bcar wash trench/i,
  /\bpit concrete/i,
  /\btrench concrete/i,
  /\bgrade beam/i,
  /\bwall footing/i,
  /\bwf footing/i,
  /\bfoundation wall/i,
  /\bcontrol joint/i,
  /\bsaw\s*cut/i,
  /\bcompaction testing/i,
  /\bconcrete testing/i,
  /\bsupervision/i,
  /\bmobilization/i,
  /\blayout coordination/i,
  /\bequipment pad/i,
  /\bequipment support/i,
  /\bpole foundation/i,
  /\bmisc(?:ellaneous)? foundation/i,
  /\bwithin\s+(?:foundations?|pits?|trenches?)/i,
  /\b(?:for|at|in)\s+(?:foundations?\s+and\s+pits?|pits?\s+and\s+foundations?)/i,
  /\b(?:for|at|in)\s+(?:continuous|isolated|spread)\s+footing/i,
  /\b(?:for|at|in)\s+(?:trench|correlator|tire seal)\s+pit/i,
  /\b(?:for|at|in)\s+(?:gate post|bollard|equipment pole)\s+foundation/i,
  /\b(?:for|at|in)\s+(?:vacuum|trash)\s+enclosure/i,
  /\bslab\s+edge\s+form/i,
  /\bstepped\s+footing/i,
  /\bfooting\s+dowel/i,
  /\bfoundation\s+continuation/i,
  /\bconcrete\s+foundations?/i,
  /\bfoundation\s+concrete/i,
  /\bfooting\s+concrete/i,
  /\bconcrete\s+(?:placement|pour)\s+(?:at|for)\s+(?:foundation|footing)/i,
  /\bslab[- ]?on[- ]?grade\s+(?:within|at|in)\s+(?:building|footprint)/i,
  /\bfiber[- ]?reinforced\s+slab/i,
];

/**
 * Patterns that indicate an item is generic/broad and should NOT be active
 * under the broad concrete profile unless it also matches a named area.
 */
const GENERIC_CONCRETE_PATTERNS: RegExp[] = [
  /^concrete\b(?!.*(?:trench|pit|car wash|footing|foundation|grade beam|testing|enclosure))/i,
  /^slab\b(?!.*(?:on[- ]?grade.*(?:building|interior|enclosed)|interior|building))/i,
  /^reinforc(?:ing|ement|ed?)\b(?!.*(?:footing|foundation|pit|trench|grade beam|enclosure))/i,
  /^rebar\b(?!.*(?:footing|foundation|pit|trench|grade beam|enclosure))/i,
  /^formwork\b(?!.*(?:footing|foundation|pit|trench|grade beam|enclosure))/i,
  /^forms?\b(?!.*(?:footing|foundation|pit|trench|grade beam|enclosure))/i,
  /\bgeneric\s+(?:concrete|slab|wall|rebar|reinforcing|formwork)/i,
  /\bbroad\s+(?:concrete|slab|reinforcing|formwork)/i,
  /\bconsolidated\s+(?:concrete|slab|reinforcing|formwork)/i,
  /\bconcrete\s+(?:for|to)\s+(?:slab|wall|column|beam|floor)\b(?!.*(?:footing|foundation|pit|trench|grade beam|enclosure))/i,
  /\bconcrete\s+(?:walls?|columns?|beams?|floors?)\b(?!.*(?:foundation|pit|trench|grade beam|enclosure))/i,
];

function matchesNamedArea(text: string): boolean {
  return NAMED_AREA_PATTERNS.some((pattern) => pattern.test(text));
}

function isGenericConcreteItem(text: string): boolean {
  return GENERIC_CONCRETE_PATTERNS.some((pattern) => pattern.test(text));
}

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
    patterns: [/\bfoundations?\s+(?:only|concrete|walls?|work|package|scope)\b/i, /\bfootings?\s+(?:only|concrete|work|package|scope)\b/i, /\bgrade beams?\b/i, /\bslab(?:-on-grade| on grade)\s+(?:only|concrete|work|package|scope)\b/i, /\bsog\b/i],
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
    // Additional patterns from NAMED_AREA_PATTERNS for consistency
    /\bwithin\s+(?:foundations?|pits?|trenches?)\b/i,
    /\b(?:for|at|in)\s+(?:foundations?\s+and\s+pits?|pits?\s+and\s+foundations?)\b/i,
    /\bconcrete\s+foundations?\b/i,
    /\bfoundation\s+continuation\b/i,
    /\bfooting\s+(?:reinforc|dowel|concrete)\b/i,
    /\bsawcut\s+control\s+joints?\b/i,
    /\bconcrete\s+testing\b/i,
    /\bcompaction\s+testing\b/i,
    /\bfield\s+supervision\b/i,
    /\bproject\s+management\b/i,
    /\bmobilization\b/i,
    /\blayout\s+coordination\b/i,
    /\bstepped\s+footing\b/i,
    /\bslab\s+edge\s+form\b/i,
    /\bfooting\s+dowel\b/i,
    /\bdowels?\s+(?:required|for)\b/i,
    /\bfoundation\s+(?:wall|concrete|drain)\b/i,
    /\bgrade\s+beam\b/i,
    /\bwall\s+footing\b/i,
    /\bcolumn\s+footing\b/i,
    /\bequipment\s+(?:pad|support)\b/i,
  ].some((pattern) => pattern.test(text));
}

function hasBroadAssemblyOnly(text: string): boolean {
  if (hasNamedIncludedWorkArea(text)) return false;
  // Only match items that are GENERIC (have generic/typical/general/related qualifiers)
  // or are clearly broad consolidations without specific named-area ties
  const hasGenericQualifier = /\b(?:generic|typ(?:ical)?|general|related|broad|misc(?:ellaneous)?)\b/i.test(text);
  const hasConcreteTerm = /\b(?:concrete|slabs?|foundations?|formwork|reinforc(?:ing|ement)?|rebar|control joints?|sawcuts?)\b/i.test(text);
  if (hasGenericQualifier && hasConcreteTerm) return true;
  // Also catch items that are ONLY a bare concrete term with no specificity
  // e.g. "Concrete placement" or "Formwork" alone, but NOT "Sawcut control joints" or "Reinforcing steel within foundations"
  if (/^(?:concrete|slab|foundation|formwork|reinforc(?:ing|ement)|rebar)\b/i.test(text.trim()) && text.trim().split(/\s+/).length <= 4) return true;
  return false;
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

/**
 * Detects if a generated/enhanced item's notes contain a calc basis that references
 * broad unrelated assemblies (slabs, beams, columns, walls, floors) rather than
 * being tied to the specific named work area in the description.
 * E.g. "Reinforcing steel for Gate Post Foundations" with calc notes about
 * "total building slab area × #5 rebar at 12 OC both ways" → broad calc basis.
 */
function hasBroadCalcBasis(text: string): boolean {
  // Look for calc/basis notes that reference multiple unrelated assembly types
  const calcSection = text.match(/(?:calc:|basis:|generated from|enhanced from|calculation:)\s*(.+)/i)?.[1] || "";
  const notesSection = text.includes("[enhanced]") || text.includes("[generated]") ? text : "";
  const checkText = calcSection || notesSection;
  if (!checkText) return false;
  const itemLabel = text.split(/(?:calc:|basis:|generated from|enhanced from|calculation:)/i)[0] || text;
  const isFoundationOrPitRebar =
    /\breinforc(?:ing|ement)|\brebar\b/i.test(itemLabel) &&
    /\b(?:footings?|foundations?|foundation continuation|pits?|trench)\b/i.test(itemLabel) &&
    !/\bslab[- ]?on[- ]?grade\b|\bslab\b/i.test(itemLabel);
  if (isFoundationOrPitRebar && /\b(?:slabs?|slab[- ]?on[- ]?grade)\b/i.test(checkText)) return true;
  // Count how many broad assembly categories are referenced
  const broadCategories = [
    /\b(?:slabs?|slab[- ]?on[- ]?grade)\b/i,
    /\b(?:beams?|grade beams?)\b/i,
    /\b(?:columns?|pilasters?|piers?)\b/i,
    /\b(?:walls?|stem walls?|retaining walls?)\b/i,
    /\b(?:floors?|elevated (?:slab|deck))\b/i,
    /\b(?:footings?|foundations?)\b/i,
    /\b(?:total\s+(?:building|project|structure))\b/i,
    /\b(?:all\s+(?:areas|sections|zones|floors))\b/i,
    /\b(?:entire\s+(?:building|structure|project))\b/i,
  ];
  const matchCount = broadCategories.filter(p => p.test(checkText)).length;
  // If calc references 3+ different assembly categories, it's a broad calc
  if (matchCount >= 3) return true;
  // Also flag if calc mentions total building/project-wide quantities
  if (/\b(?:total\s+(?:building|project|structure)|project[- ]wide|building[- ]wide|all\s+(?:concrete|rebar|reinforcing))\b/i.test(checkText)) return true;
  return false;
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
  if (/\b(?:beyond foundation scope|beyond included pits and drains|beyond included pits|beyond onsite reuse|outside (?:the )?building footprint)\b/i.test(itemText)) {
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
  // Only match profiles against include/scope clauses, not exclude clauses
  const includeClauseText = originalText.replace(/\bexclude[^.;]*/gi, "").replace(/\bnot including[^.;]*/gi, "").replace(/\bno\s+[^.;]*/gi, "");
  const matched = TRADE_PROFILES.filter((profile) => profile.patterns.some((pattern) => pattern.test(includeClauseText)));
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

  // Check if item has an explicit include that is NOT also explicitly excluded
  // (i.e., a "clean" include that unambiguously protects the item from exclusion)
  // Only count families that are the item's PRIMARY nature (from description), not incidental references.
  // E.g., "Concrete equipment support for storefront" — glazing is incidental, concrete is primary.
  const descText = (item.description || "").toLowerCase();
  const descFamiliesForExclude = matchingFamilies(descText);
  const descNonSupportForExclude = descFamiliesForExclude.filter((f) => !SUPPORT_FAMILIES.includes(f));
  // A family is "primary" if it's not just a prepositional target ("for storefront", "at glazing")
  // Heuristic: if the excluded family appears BEFORE the included family in the description, the excluded family is primary
  const hasCleanExplicitInclude = (() => {
    const cleanNonSupport = descNonSupportForExclude.filter((family) =>
      containsFamily(intent.explicitIncludes, family) && !containsFamily(intent.explicitExcludes, family)
    );
    if (cleanNonSupport.length === 0) {
      // Check support families only if there are no non-support families
      if (descNonSupportForExclude.length === 0) {
        return descFamiliesForExclude.filter((f) => SUPPORT_FAMILIES.includes(f)).some((family) =>
          containsFamily(intent.explicitIncludes, family) && !containsFamily(intent.explicitExcludes, family)
        );
      }
      return false;
    }
    // If the item also has an excluded non-support family, check which appears first in description
    const excludedNonSupport = descNonSupportForExclude.filter((family) =>
      containsFamily(intent.explicitExcludes, family)
    );
    if (excludedNonSupport.length === 0) return true; // Only clean includes, no conflict
    // Find first position of excluded vs included family in description
    const firstExcludedPos = Math.min(...excludedNonSupport.map((f) => {
      const patterns = TERM_PATTERNS[f];
      const positions = patterns.map((p) => { const m = descText.match(p); return m?.index ?? Infinity; });
      return Math.min(...positions);
    }));
    const firstIncludedPos = Math.min(...cleanNonSupport.map((f) => {
      const patterns = TERM_PATTERNS[f];
      const positions = patterns.map((p) => { const m = descText.match(p); return m?.index ?? Infinity; });
      return Math.min(...positions);
    }));
    // If the included family appears BEFORE the excluded family, it's the primary nature
    return firstIncludedPos < firstExcludedPos;
  })();

  if (matchesExplicitExcludedPhrase(text, intent.normalizedText)) return "excluded";
  if (hasExplicitExclude && !hasCleanExplicitInclude && !(hasBroadConcretePackageProfile && hasProfileInclude) && !hasProtectiveExplicitInclude) return "excluded";
  if (hasExplicitExclude && !hasExplicitInclude) return "excluded";
  if (hasProfileExclude && hasUnincludedHardExcludedFamily) {
    return intent.scopeStrictness === "review_first" ? "review" : "excluded";
  }

  // Explicit excludes override profile includes — if the item's families are all excluded, it cannot be active
  const nonSupportFamilies = families.filter((family) => !SUPPORT_FAMILIES.includes(family));
  const allNonSupportExcluded = nonSupportFamilies.length > 0 && nonSupportFamilies.every((family) => containsFamily(intent.explicitExcludes, family));
  if (allNonSupportExcluded && !hasExplicitInclude) return "excluded";

  if (hasExplicitInclude) {
    // If the item is primarily support work (formwork/rebar) that merely references an included item
    // (e.g. "Formwork for Keyway Waterstop"), the support family should drive classification, not the included reference.
    // But if the support families themselves are explicitly included (e.g. "Include rebar, formwork"), let them through.
    const supportFamiliesExplicitlyIncluded = supportFamilies.every((f) => containsFamily(intent.explicitIncludes, f) || containsFamily(intent.supportWorkAllowed, f) || profiles.some((p) => p.includedFamilies.includes(f)));
    if (!supportFamiliesExplicitlyIncluded && supportFamilies.length > 0) {
      const primaryFamilies = families.filter((f) => !SUPPORT_FAMILIES.includes(f));
      const supportOnly = primaryFamilies.length === 0;
      const supportWithIncludedRef = primaryFamilies.length > 0 && primaryFamilies.every((f) => containsFamily(intent.explicitIncludes, f));
      if (supportOnly || supportWithIncludedRef) return "review";
    }
    if (hasUnownedSupport) return "review";
    if (quantityNeedsReview) return "review";
    if (families.includes("belowGradeInsulation") && !hasProfileInclude) return "review";

    // Named-area gate (also applies when item has explicit include via broad families like concrete/rebar/formwork)
    if (
      hasBroadConcretePackageProfile &&
      intent.scopeStrictness === "strict" &&
      hasProfileInclude
    ) {
      const concreteRelatedFamilies: TermFamily[] = ["concrete", "slab", "footing", "rebar", "formwork"];
      // Determine if the item's DESCRIPTION is primarily about concrete/slab/rebar/formwork.
      // Use the description alone (not notes) to determine the item's primary nature.
      const descText = (item.description || "").toLowerCase();
      const descFamilies = matchingFamilies(descText);
      const descNonSupport = descFamilies.filter((f) => !SUPPORT_FAMILIES.includes(f));
      // Item is concrete-related if:
      // 1. Its description's non-support families are all concrete-related, OR
      // 2. It's a support-only item (rebar/formwork) with no other primary family (generic support)
      const descPrimaryIsConcreteRelated = descNonSupport.length > 0 && descNonSupport.every((f) => concreteRelatedFamilies.includes(f));
      const isGenericSupportOnly = descNonSupport.length === 0 && descFamilies.some((f) => ["rebar", "formwork"].includes(f));
      // Also check that the item isn't primarily about something else (subgradePrep, excavation, etc.)
      const hasNonConcreteDescPrimary = descFamilies.some((f) => ["subgradePrep", "excavation", "backfill", "compactedBase"].includes(f) && !concreteRelatedFamilies.includes(f));

      if ((descPrimaryIsConcreteRelated || isGenericSupportOnly) && !hasNonConcreteDescPrimary) {
        const hasNamedArea = matchesNamedArea(text);
        const isGeneric = isGenericConcreteItem(descText);
        if (isGeneric && !hasNamedArea) return "review";
        if (!hasNamedArea && !families.some((f) => ["trenchPit", "miscFoundations", "vaporBarrier", "belowGradeInsulation", "termiteTreatment", "controlJoint", "testingCoordination", "supervision", "equipmentSupport", "footing"].includes(f))) {
          return "review";
        }
      }
    }

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
    // Double-check: if the item's primary families are all in explicitExcludes, exclude it even if a profile says include
    const itemPrimaryFamilies = families.filter((f) => !SUPPORT_FAMILIES.includes(f));
    const allPrimaryExcluded = itemPrimaryFamilies.length > 0 && itemPrimaryFamilies.every((f) => containsFamily(intent.explicitExcludes, f));
    if (allPrimaryExcluded) return "excluded";
    if (quantityNeedsReview) return "review";

    // Named-area gate for broad concrete profile in trade_package mode:
    // Generic concrete/slab/rebar/formwork items without a named-area tie → review
    if (
      hasBroadConcretePackageProfile &&
      intent.scopeStrictness === "strict" &&
      !hasExplicitInclude
    ) {
      const concreteRelatedFamilies: TermFamily[] = ["concrete", "slab", "footing", "rebar", "formwork"];
      const descText = (item.description || "").toLowerCase();
      const descFamilies = matchingFamilies(descText);
      const descNonSupport = descFamilies.filter((f) => !SUPPORT_FAMILIES.includes(f));
      const descPrimaryIsConcreteRelated = descNonSupport.length > 0 && descNonSupport.every((f) => concreteRelatedFamilies.includes(f));
      const isGenericSupportOnly = descNonSupport.length === 0 && descFamilies.some((f) => ["rebar", "formwork"].includes(f));
      const hasNonConcreteDescPrimary = descFamilies.some((f) => ["subgradePrep", "excavation", "backfill", "compactedBase"].includes(f) && !concreteRelatedFamilies.includes(f));

      if ((descPrimaryIsConcreteRelated || isGenericSupportOnly) && !hasNonConcreteDescPrimary) {
        const hasNamedArea = matchesNamedArea(text);
        const isGeneric = isGenericConcreteItem(descText);
        if (isGeneric && !hasNamedArea) return "review";
        if (!hasNamedArea && !families.some((f) => ["trenchPit", "miscFoundations", "vaporBarrier", "belowGradeInsulation", "termiteTreatment", "controlJoint", "testingCoordination", "supervision", "equipmentSupport", "footing"].includes(f))) {
          return "review";
        }
      }
    }

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

  // --- Safety rules: only target generated/weak/broad rows, not explicit includes with evidence ---
  // Rule 1: Weak evidence (placeholder, assumed, missing) → only demote if generated/consolidated
  if (weakEvidence && generatedOrConsolidated) return "review";
  // Rule 2: Broad assembly only (generic concrete, generic slab) → only demote if generated/consolidated or high-dollar
  if (broadOnly && (generatedOrConsolidated || isHighDollar)) return "review";
  // Rule 3: Generated/consolidated without named anchor → always review
  if (generatedOrConsolidated && !namedAnchor) return "review";
  // Rule 4: High-dollar generated items with named area but broad unrelated calc basis → review
  if (isHighDollar && generatedOrConsolidated && namedAnchor && hasBroadCalcBasis(text)) return "review";
  // Rule 5: High-dollar generated/repeated with no named anchor or weak evidence → review
  if (isHighDollar && (generatedOrConsolidated || repeatedAssembly) && (!namedAnchor || weakEvidence)) return "review";
  // Rule 6: High-dollar control joints → only demote if generated/consolidated (legitimate sawcut items can be high-dollar)
  if (highDollarControlJoint && generatedOrConsolidated) return "review";

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

// ─── Scope Safety Pass ─────────────────────────────────────────────────────────
// Post-classification pass that runs on the full item set to catch over-counting.
// Returns items with updated notes (scope status tags) where safety rules trigger.

export interface SafetyPassItem {
  id?: string | number;
  description?: string | null;
  notes?: string | null;
  extendedCost?: number | string | null;
  csiDivision?: string | null;
  csiCode?: string | null;
  quantity?: number | string | null;
}

export interface SafetyPassResult {
  items: SafetyPassItem[];
  demotedCount: number;
  demotedIds: (string | number)[];
  warnings: string[];
}

/**
 * High-dollar threshold: $10,000 per item (in cents = 1_000_000) OR 10% of active subtotal.
 * Items exceeding this threshold are demoted to review unless they have strong evidence
 * (named-area match or explicit include).
 */
const HIGH_DOLLAR_ABSOLUTE_CENTS = 1_000_000; // $10,000 in cents
const HIGH_DOLLAR_PERCENTAGE = 0.10; // 10% of active subtotal

function getExtendedCostCents(item: SafetyPassItem): number {
  const cost = typeof item.extendedCost === "number" ? item.extendedCost : Number(item.extendedCost || 0);
  return Number.isFinite(cost) ? cost : 0;
}

function normalizeDescription(desc: string | null | undefined): string {
  return (desc || "").toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

/**
 * Scope safety pass — call after initial classification to catch over-counting.
 * Only applies in trade_package (strict) mode.
 *
 * Rules:
 * 1. High-dollar review: items over $10k or 10% of active subtotal → review
 *    unless they match a named area or have strong sheet evidence.
 * 2. Duplicate detection: if multiple items have very similar descriptions and
 *    are both active, keep the one with clearest evidence, demote others.
 */
export function scopeSafetyPass(
  items: SafetyPassItem[],
  intent: ScopeIntent
): SafetyPassResult {
  // Only apply in trade_package (strict) mode
  if (intent.scopeStrictness !== "strict") {
    return { items, demotedCount: 0, demotedIds: [], warnings: [] };
  }

  const result = items.map((item) => ({ ...item }));
  const demotedIds: (string | number)[] = [];
  const warnings: string[] = [];

  // Compute active subtotal (items currently marked as included)
  const activeSubtotalCents = result.reduce((sum, item) => {
    const status = getScopeStatusFromNotes(item.notes);
    return status === "included" ? sum + getExtendedCostCents(item) : sum;
  }, 0);

  const highDollarThresholdCents = Math.max(
    HIGH_DOLLAR_ABSOLUTE_CENTS,
    activeSubtotalCents * HIGH_DOLLAR_PERCENTAGE
  );

  // Pass 1: High-dollar review — only target generated/weak/broad rows, not explicit includes
  for (const item of result) {
    const status = getScopeStatusFromNotes(item.notes);
    if (status !== "included") continue;

    const cost = getExtendedCostCents(item);
    if (cost <= highDollarThresholdCents) continue;

    const text = `${item.description || ""} ${item.notes || ""}`.toLowerCase();
    const isGenOrConsolidated = isGeneratedOrConsolidated(text);
    const isWeak = hasWeakSheetEvidence(text);
    const isBroad = hasBroadAssemblyOnly(text);

    // Only demote high-dollar items that are generated/consolidated, have weak evidence, or are broad
    if (!isGenOrConsolidated && !isWeak && !isBroad) continue;

    // Skip if item has strong evidence (named area, explicit scope match)
    if (matchesNamedArea(text) && !hasBroadCalcBasis(text)) continue;
    // Skip if item is clearly a core scope item (any concrete package family)
    const families = matchingFamilies(text);
    const isCoreScope = families.some((f) =>
      ["waterproofing", "vaporBarrier", "waterstop", "protectionBoard", "drainageBoard", "foundationDrain",
       "slab", "footing", "concrete", "subgradePrep", "excavation", "compactedBase", "controlJoint",
       "termiteTreatment", "belowGradeInsulation", "trenchPit", "miscFoundations"].includes(f)
    );
    // For core scope items, only demote if generated with broad calc basis
    if (isCoreScope && !isBroad && !(isGenOrConsolidated && hasBroadCalcBasis(text))) continue;
    // Skip if item has sheet-level evidence markers
    if (/\bsheet\s+[A-Z]?\d|\bpage\s+\d|\bdwg\b|\bdetail\s+\d/i.test(text)) continue;

    // Demote to review
    const costDollars = (cost / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
    const note = item.notes || "";
    if (!note.startsWith("[Scope:")) {
      item.notes = `[Scope: review] High-dollar item (${costDollars}) held for review. ${note}`.trim();
    }
    if (item.id != null) demotedIds.push(item.id);
  }

  // Pass 2: Duplicate detection
  const activeItems = result.filter((item) => getScopeStatusFromNotes(item.notes) === "included");
  const seen = new Map<string, SafetyPassItem>();
  for (const item of activeItems) {
    const normalized = normalizeDescription(item.description);
    if (!normalized || normalized.length < 10) continue;

    // Check for near-duplicates (same first 30 chars)
    const key = normalized.slice(0, 30);
    const existing = seen.get(key);
    if (existing) {
      // Keep the one with higher cost (more likely to be the detailed one)
      const existingCost = getExtendedCostCents(existing);
      const currentCost = getExtendedCostCents(item);
      const toDemote = currentCost <= existingCost ? item : existing;
      if (currentCost > existingCost) seen.set(key, item);

      const note = toDemote.notes || "";
      if (!note.startsWith("[Scope:")) {
        toDemote.notes = `[Scope: review] Possible duplicate assembly — verify before including. ${note}`.trim();
      }
      if (toDemote.id != null) demotedIds.push(toDemote.id);
    } else {
      seen.set(key, item);
    }
  }

  if (demotedIds.length > 0) {
    warnings.push(`Scope safety pass demoted ${demotedIds.length} item(s) to review.`);
  }

  return {
    items: result,
    demotedCount: demotedIds.length,
    demotedIds,
    warnings,
  };
}
