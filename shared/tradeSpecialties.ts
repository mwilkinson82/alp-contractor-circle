/**
 * Trade Specialty Intelligence Taxonomy
 *
 * Maps CSI divisions to their sub-trade specialties, detection signals,
 * and construction considerations that go beyond what's literally on the drawing.
 *
 * The AI engine uses this taxonomy to:
 * 1. Auto-detect the specialty from drawing analysis
 * 2. Inject specialty-specific prompting into takeoff generation
 * 3. Generate line items that a specialty contractor would include
 *
 * Based on CSI MasterFormat 2024 with real-world estimating knowledge.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TradeSpecialty {
  /** Unique key for this specialty, e.g. "concrete_tilt_up" */
  id: string;
  /** CSI division code, e.g. "03" */
  divisionCode: string;
  /** CSI sub-section code if applicable, e.g. "03 47 13" */
  csiSubCode?: string;
  /** Human-readable name, e.g. "Tilt-Up Concrete" */
  name: string;
  /** Short description for the UI */
  description: string;
  /** Keywords/phrases the AI should look for on drawings to detect this specialty */
  detectionSignals: string[];
  /** Sheet types most likely to contain this specialty */
  relevantSheetTypes: string[];
  /**
   * Additional line items the AI should generate when this specialty is detected.
   * These are items a specialty contractor would include that may NOT be visible on the drawing.
   */
  additionalLineItems: SpecialtyLineItem[];
  /**
   * Construction considerations injected into the AI prompt.
   * These guide the AI to think like a specialty contractor.
   */
  constructionNotes: string[];
}

export interface SpecialtyLineItem {
  /** CSI code for this item */
  csiCode: string;
  /** Description template — AI fills in project-specific details */
  descriptionTemplate: string;
  /** Unit of measure */
  unit: string;
  /** How to estimate quantity from available drawing info */
  quantityGuidance: string;
  /** Whether this item is always needed or conditional */
  condition: "always" | "conditional";
  /** When conditional, what triggers inclusion */
  conditionNote?: string;
}

// ─── Division 03: Concrete Specialties ────────────────────────────────────────

const CONCRETE_TILT_UP: TradeSpecialty = {
  id: "concrete_tilt_up",
  divisionCode: "03",
  csiSubCode: "03 47 13",
  name: "Tilt-Up Concrete",
  description: "Site-cast concrete wall panels tilted into position by crane",
  detectionSignals: [
    "tilt-up", "tilt up", "TU panel", "panel elevation",
    "panel schedule", "casting bed", "lift insert", "pick point",
    "brace insert", "tilt wall", "panel layout", "bond breaker",
    "strongback", "panel erection", "tilt-up bracing",
  ],
  relevantSheetTypes: ["structural", "elevation", "detail", "floor_plan"],
  additionalLineItems: [
    {
      csiCode: "03 47 13",
      descriptionTemplate: "Casting Bed Preparation — bond breaker application",
      unit: "SF",
      quantityGuidance: "Total panel area being cast (sum of all panel SF from panel schedule)",
      condition: "always",
    },
    {
      csiCode: "03 47 13",
      descriptionTemplate: "Tilt-Up Panel Edge Forms",
      unit: "LF",
      quantityGuidance: "Total perimeter of all panels (sum panel perimeters from schedule)",
      condition: "always",
    },
    {
      csiCode: "03 47 13",
      descriptionTemplate: "Lift Inserts / Pick Points (Meadow Burke or equiv.)",
      unit: "EA",
      quantityGuidance: "Typically 4-8 per panel depending on size/weight; count from lift insert layout or estimate 6 per panel",
      condition: "always",
    },
    {
      csiCode: "03 47 13",
      descriptionTemplate: "Brace Inserts (panel side)",
      unit: "EA",
      quantityGuidance: "Typically 2-4 per panel; count from brace layout or estimate 3 per panel",
      condition: "always",
    },
    {
      csiCode: "03 47 13",
      descriptionTemplate: "Temporary Panel Bracing (adjustable steel braces)",
      unit: "EA",
      quantityGuidance: "Typically 2-4 braces per panel; estimate 3 per panel average",
      condition: "always",
    },
    {
      csiCode: "03 47 13",
      descriptionTemplate: "Ground Anchors for Temporary Bracing",
      unit: "EA",
      quantityGuidance: "One anchor per brace; match brace count",
      condition: "always",
    },
    {
      csiCode: "03 47 13",
      descriptionTemplate: "Crane Mobilization & Rigging for Panel Erection",
      unit: "LS",
      quantityGuidance: "1 LS — crane size depends on heaviest panel weight and max reach distance",
      condition: "always",
    },
    {
      csiCode: "03 47 13",
      descriptionTemplate: "Panel Connection Hardware (weld plates, embed plates, angles)",
      unit: "EA",
      quantityGuidance: "Typically 4-8 connections per panel; count from connection details or estimate 6 per panel",
      condition: "always",
    },
    {
      csiCode: "07 92 00",
      descriptionTemplate: "Panel Joint Sealant (backer rod + sealant)",
      unit: "LF",
      quantityGuidance: "Total LF of vertical and horizontal panel joints; count joints × joint height",
      condition: "always",
    },
    {
      csiCode: "03 47 13",
      descriptionTemplate: "Lift Insert Patching (after brace removal)",
      unit: "EA",
      quantityGuidance: "Match lift insert count — each insert location needs patching",
      condition: "always",
    },
    {
      csiCode: "03 47 13",
      descriptionTemplate: "Reveal Strips / Rustication Joints",
      unit: "LF",
      quantityGuidance: "Measure from panel elevation drawings; horizontal and vertical reveals",
      condition: "conditional",
      conditionNote: "Only if panel elevations show reveal/rustication patterns",
    },
    {
      csiCode: "03 47 13",
      descriptionTemplate: "Strongbacks for Thin/Tall Panels",
      unit: "EA",
      quantityGuidance: "Required for panels with height-to-thickness ratio > 50:1; count affected panels",
      condition: "conditional",
      conditionNote: "Only for panels exceeding standard height-to-thickness ratios",
    },
  ],
  constructionNotes: [
    "Tilt-up panels are cast flat on the building slab or a temporary casting bed, then tilted into position by crane.",
    "Always account for bond breaker on the casting surface — without it, panels bond to the slab.",
    "Lift inserts must be engineered for panel weight; typical panels weigh 20,000-80,000 lbs.",
    "Temporary bracing remains in place until roof structure is connected and provides lateral stability.",
    "Panel connections at the base, panel-to-panel joints, and panel-to-roof connections are all separate items.",
    "Crane selection depends on heaviest panel weight and maximum required reach — this is a major cost driver.",
    "Joint sealant between panels is critical for weatherproofing and is often missed in takeoffs.",
    "Reveal strips create architectural patterns and must be installed in forms before the pour.",
  ],
};

const CONCRETE_CAST_IN_PLACE: TradeSpecialty = {
  id: "concrete_cast_in_place",
  divisionCode: "03",
  csiSubCode: "03 30 00",
  name: "Cast-in-Place Concrete",
  description: "Concrete formed and poured on-site in its final position",
  detectionSignals: [
    "cast-in-place", "CIP", "formwork", "form detail",
    "pour sequence", "construction joint", "wall form",
    "column form", "slab form", "shoring", "reshoring",
    "concrete placement", "rebar schedule", "reinforcing schedule",
  ],
  relevantSheetTypes: ["structural", "detail", "section", "floor_plan"],
  additionalLineItems: [
    {
      csiCode: "03 11 00",
      descriptionTemplate: "Wall Formwork (form, strip, clean)",
      unit: "SFCA",
      quantityGuidance: "Contact area: wall height × wall length × 2 sides",
      condition: "always",
    },
    {
      csiCode: "03 11 00",
      descriptionTemplate: "Column Formwork",
      unit: "SFCA",
      quantityGuidance: "Column perimeter × height × number of columns",
      condition: "conditional",
      conditionNote: "Only if columns are shown on structural drawings",
    },
    {
      csiCode: "03 11 00",
      descriptionTemplate: "Elevated Slab Formwork & Shoring",
      unit: "SF",
      quantityGuidance: "Slab area for each elevated level; includes shoring/reshoring",
      condition: "conditional",
      conditionNote: "Only for elevated slabs (not slab-on-grade)",
    },
    {
      csiCode: "03 15 00",
      descriptionTemplate: "Form Ties, Snap Ties & Hardware",
      unit: "EA",
      quantityGuidance: "Approximately 1 tie per 2 SF of wall form area",
      condition: "always",
    },
    {
      csiCode: "03 15 00",
      descriptionTemplate: "Form Release Agent",
      unit: "GAL",
      quantityGuidance: "Approximately 1 gallon per 200 SF of form area",
      condition: "always",
    },
    {
      csiCode: "03 39 00",
      descriptionTemplate: "Concrete Curing Compound",
      unit: "SF",
      quantityGuidance: "All exposed concrete surfaces (slabs, walls after strip)",
      condition: "always",
    },
    {
      csiCode: "03 15 70",
      descriptionTemplate: "Waterstop at Construction Joints",
      unit: "LF",
      quantityGuidance: "Total LF of construction joints below grade",
      condition: "conditional",
      conditionNote: "Required at all below-grade construction joints",
    },
    {
      csiCode: "03 30 00",
      descriptionTemplate: "Concrete Pumping",
      unit: "CY",
      quantityGuidance: "Total CY of concrete requiring pump placement (elevated or distant pours)",
      condition: "conditional",
      conditionNote: "When direct chute placement is not feasible",
    },
  ],
  constructionNotes: [
    "Formwork is typically 40-60% of the cost of cast-in-place concrete work.",
    "Always separate formwork by type: wall forms, column forms, slab forms — they have different unit costs.",
    "Shoring for elevated slabs must remain until concrete reaches design strength; reshoring may be needed for multiple levels.",
    "Construction joints require waterstops below grade and keyways above grade.",
    "Concrete pumping is needed for elevated pours and when the truck cannot reach the pour location directly.",
    "Curing is critical — specify compound, wet burlap, or curing blankets depending on conditions.",
  ],
};

const CONCRETE_PRECAST: TradeSpecialty = {
  id: "concrete_precast",
  divisionCode: "03",
  csiSubCode: "03 41 00",
  name: "Precast Concrete",
  description: "Factory-manufactured concrete elements delivered and erected on-site",
  detectionSignals: [
    "precast", "PC", "precast schedule", "erection plan",
    "connection detail", "precast panel", "hollow core",
    "double tee", "inverted tee", "precast beam",
    "precast column", "spandrel", "precast plank",
  ],
  relevantSheetTypes: ["structural", "elevation", "detail", "schedule"],
  additionalLineItems: [
    {
      csiCode: "03 41 00",
      descriptionTemplate: "Precast Element Transportation & Delivery",
      unit: "EA",
      quantityGuidance: "Number of precast pieces × delivery trips (typically 4-6 pieces per truck)",
      condition: "always",
    },
    {
      csiCode: "03 41 00",
      descriptionTemplate: "Crane Mobilization for Precast Erection",
      unit: "LS",
      quantityGuidance: "1 LS — crane size based on heaviest piece and max reach",
      condition: "always",
    },
    {
      csiCode: "03 41 00",
      descriptionTemplate: "Precast Connection Hardware (weld plates, bolts, bearing pads)",
      unit: "EA",
      quantityGuidance: "Count from connection details; typically 2-4 connections per piece",
      condition: "always",
    },
    {
      csiCode: "03 41 00",
      descriptionTemplate: "Precast Joint Grouting",
      unit: "LF",
      quantityGuidance: "Total LF of joints between precast elements",
      condition: "always",
    },
    {
      csiCode: "07 92 00",
      descriptionTemplate: "Precast Joint Sealant",
      unit: "LF",
      quantityGuidance: "Total LF of exposed joints requiring weatherseal",
      condition: "always",
    },
    {
      csiCode: "03 41 00",
      descriptionTemplate: "Precast Touch-Up & Patching",
      unit: "EA",
      quantityGuidance: "Allow per piece for minor damage repair during transport/erection",
      condition: "always",
    },
  ],
  constructionNotes: [
    "Precast is manufactured off-site — lead time is typically 8-16 weeks from shop drawing approval.",
    "Transportation logistics are a significant cost: piece size, weight, route restrictions, and distance from plant.",
    "Erection sequence must be coordinated with the structural engineer — temporary bracing is required.",
    "Connection details vary: welded, bolted, grouted — each has different labor and material costs.",
    "Bearing pads (neoprene or PTFE) are needed at all beam-to-column and plank-to-beam connections.",
  ],
};

const CONCRETE_POST_TENSION: TradeSpecialty = {
  id: "concrete_post_tension",
  divisionCode: "03",
  csiSubCode: "03 23 00",
  name: "Post-Tensioned Concrete",
  description: "Concrete with tensioned steel tendons for longer spans and thinner slabs",
  detectionSignals: [
    "post-tension", "PT", "tendon", "stressing",
    "anchorage", "PT layout", "tendon profile",
    "stressing schedule", "PT slab", "unbonded tendon",
    "bonded tendon", "post-tensioning",
  ],
  relevantSheetTypes: ["structural", "detail", "floor_plan"],
  additionalLineItems: [
    {
      csiCode: "03 23 00",
      descriptionTemplate: "Post-Tension Tendons (unbonded, greased & sheathed)",
      unit: "LF",
      quantityGuidance: "Count tendons × span length from PT layout; include drape length",
      condition: "always",
    },
    {
      csiCode: "03 23 00",
      descriptionTemplate: "PT Anchorage Hardware (live end + dead end)",
      unit: "EA",
      quantityGuidance: "2 anchorages per tendon (1 live end + 1 dead end)",
      condition: "always",
    },
    {
      csiCode: "03 23 00",
      descriptionTemplate: "PT Stressing (field stressing labor & equipment)",
      unit: "EA",
      quantityGuidance: "1 stressing operation per live-end anchorage",
      condition: "always",
    },
    {
      csiCode: "03 23 00",
      descriptionTemplate: "PT Pocket Grouting (after stressing)",
      unit: "EA",
      quantityGuidance: "1 pocket per live-end anchorage",
      condition: "always",
    },
    {
      csiCode: "03 23 00",
      descriptionTemplate: "PT Shop Drawings & Engineering",
      unit: "LS",
      quantityGuidance: "1 LS — PT subcontractor provides engineering and shop drawings",
      condition: "always",
    },
  ],
  constructionNotes: [
    "Post-tensioning is typically subcontracted to a specialty PT contractor who provides engineering, materials, and stressing.",
    "Tendons must be stressed after concrete reaches minimum compressive strength (typically 3,000-3,500 PSI).",
    "PT slabs are thinner than conventional reinforced slabs — typically 7-8 inches vs 10-12 inches for equivalent spans.",
    "Do not cut or core through PT slabs without locating tendons first — this is a critical safety issue.",
    "Stressing records must be documented and submitted to the engineer of record.",
  ],
};

// ─── Division 04: Masonry Specialties ─────────────────────────────────────────

const MASONRY_CMU: TradeSpecialty = {
  id: "masonry_cmu",
  divisionCode: "04",
  csiSubCode: "04 22 00",
  name: "CMU / Concrete Block",
  description: "Concrete masonry unit construction — structural and non-structural",
  detectionSignals: [
    "CMU", "concrete block", "masonry wall", "block wall",
    "8\" CMU", "12\" CMU", "grouted", "reinforced masonry",
    "split-face", "burnished block", "ground-face",
    "bond beam", "lintel block", "pilaster",
  ],
  relevantSheetTypes: ["structural", "floor_plan", "elevation", "detail", "section"],
  additionalLineItems: [
    {
      csiCode: "04 22 00",
      descriptionTemplate: "Mortar for CMU Walls (Type S or N)",
      unit: "CF",
      quantityGuidance: "Approximately 8.5 CF per 100 SF of 8\" CMU wall",
      condition: "always",
    },
    {
      csiCode: "04 22 00",
      descriptionTemplate: "CMU Bond Beam (filled and reinforced)",
      unit: "LF",
      quantityGuidance: "At top of wall, at floor/roof bearing, and at 4' intervals per code",
      condition: "always",
    },
    {
      csiCode: "04 22 00",
      descriptionTemplate: "Vertical Reinforcing in CMU (#4 or #5 bars)",
      unit: "LF",
      quantityGuidance: "Wall height × number of reinforced cells (typically every 32\" or 48\" OC)",
      condition: "always",
    },
    {
      csiCode: "04 22 00",
      descriptionTemplate: "CMU Grout Fill (fine grout)",
      unit: "CF",
      quantityGuidance: "Volume of grouted cells: count reinforced cells × cell volume × wall height",
      condition: "always",
    },
    {
      csiCode: "04 22 00",
      descriptionTemplate: "Masonry Wall Ties / Anchors",
      unit: "EA",
      quantityGuidance: "1 tie per 2.67 SF of wall area (every 16\" horizontally, every 16\" vertically)",
      condition: "conditional",
      conditionNote: "When CMU is backup for veneer or connects to structure",
    },
    {
      csiCode: "04 05 23",
      descriptionTemplate: "Masonry Horizontal Joint Reinforcement (ladder or truss type)",
      unit: "LF",
      quantityGuidance: "Wall length × number of courses with reinforcement (typically every other course)",
      condition: "always",
    },
    {
      csiCode: "04 05 19",
      descriptionTemplate: "Masonry Lintels (steel angle or precast)",
      unit: "EA",
      quantityGuidance: "1 lintel per door/window opening in masonry walls",
      condition: "always",
    },
  ],
  constructionNotes: [
    "CMU walls require mortar, grout, reinforcing, and joint reinforcement — these are separate cost items.",
    "Bond beams are required at the top of walls, at floor/roof bearing levels, and at regular intervals per structural design.",
    "Grouted cells add significant material cost — count the number of grouted cells carefully.",
    "Control joints in CMU walls are typically spaced at 20-25 foot intervals and at changes in wall height or thickness.",
    "Scaffolding is needed for walls over 4 feet — include scaffold rental in the estimate.",
  ],
};

const MASONRY_BRICK_VENEER: TradeSpecialty = {
  id: "masonry_brick_veneer",
  divisionCode: "04",
  csiSubCode: "04 21 00",
  name: "Brick Veneer",
  description: "Face brick applied as a non-structural exterior cladding",
  detectionSignals: [
    "brick veneer", "face brick", "brick elevation",
    "soldier course", "rowlock", "brick pattern",
    "running bond", "stack bond", "flemish bond",
    "brick tie", "weep hole", "brick shelf angle",
  ],
  relevantSheetTypes: ["elevation", "detail", "section"],
  additionalLineItems: [
    {
      csiCode: "04 21 00",
      descriptionTemplate: "Mortar for Brick Veneer (Type N or S)",
      unit: "CF",
      quantityGuidance: "Approximately 7 CF per 100 SF of standard modular brick",
      condition: "always",
    },
    {
      csiCode: "04 21 00",
      descriptionTemplate: "Brick Veneer Ties to Backup Wall",
      unit: "EA",
      quantityGuidance: "1 tie per 2.67 SF of brick area",
      condition: "always",
    },
    {
      csiCode: "07 62 00",
      descriptionTemplate: "Through-Wall Flashing at Shelf Angles and Base",
      unit: "LF",
      quantityGuidance: "LF at base of wall, at each shelf angle, above openings, at roof line",
      condition: "always",
    },
    {
      csiCode: "04 21 00",
      descriptionTemplate: "Weep Holes (open head joint or tube type)",
      unit: "EA",
      quantityGuidance: "1 weep hole every 24\" OC at base and above all flashing locations",
      condition: "always",
    },
    {
      csiCode: "05 50 00",
      descriptionTemplate: "Shelf Angles (structural steel support for brick)",
      unit: "LF",
      quantityGuidance: "LF at each floor line where brick is supported; typically every 2-3 stories",
      condition: "conditional",
      conditionNote: "Multi-story buildings where brick cannot be self-supporting",
    },
    {
      csiCode: "07 92 00",
      descriptionTemplate: "Sealant at Brick Control Joints",
      unit: "LF",
      quantityGuidance: "Control joints at 20-25' intervals and at building corners",
      condition: "always",
    },
  ],
  constructionNotes: [
    "Brick veneer requires a 1-inch air space behind the brick for drainage and ventilation.",
    "Through-wall flashing is critical at every horizontal interruption: shelf angles, window heads, base of wall.",
    "Weep holes must align with flashing to allow moisture to drain from the cavity.",
    "Shelf angles at floor lines support the brick above — they must be designed by the structural engineer.",
    "Scaffolding is a significant cost for multi-story brick work — include in the estimate.",
  ],
};

// ─── Division 05: Metals Specialties ──────────────────────────────────────────

const METALS_STRUCTURAL_STEEL: TradeSpecialty = {
  id: "metals_structural_steel",
  divisionCode: "05",
  csiSubCode: "05 12 00",
  name: "Structural Steel",
  description: "Wide-flange beams, columns, and connections for building framework",
  detectionSignals: [
    "structural steel", "W-shape", "wide flange", "steel beam",
    "steel column", "moment frame", "braced frame",
    "steel schedule", "connection detail", "base plate",
    "anchor bolt", "shear tab", "moment connection",
    "HSS", "tube steel", "steel joist",
  ],
  relevantSheetTypes: ["structural", "detail", "schedule", "elevation"],
  additionalLineItems: [
    {
      csiCode: "05 12 00",
      descriptionTemplate: "Structural Steel Shop Drawings & Detailing",
      unit: "LS",
      quantityGuidance: "1 LS — typically included in fabricator's scope",
      condition: "always",
    },
    {
      csiCode: "05 12 00",
      descriptionTemplate: "Structural Steel Fabrication",
      unit: "TON",
      quantityGuidance: "Total tonnage from steel schedule; beams + columns + bracing + misc",
      condition: "always",
    },
    {
      csiCode: "05 12 00",
      descriptionTemplate: "Structural Steel Erection (crane, bolting crew)",
      unit: "TON",
      quantityGuidance: "Match fabrication tonnage — erection is priced per ton",
      condition: "always",
    },
    {
      csiCode: "05 12 00",
      descriptionTemplate: "High-Strength Bolts (A325 or A490)",
      unit: "EA",
      quantityGuidance: "Count from connection details; typically 4-12 bolts per connection",
      condition: "always",
    },
    {
      csiCode: "05 12 00",
      descriptionTemplate: "Base Plates & Anchor Bolts",
      unit: "EA",
      quantityGuidance: "1 set per column; count columns from structural plan",
      condition: "always",
    },
    {
      csiCode: "05 12 00",
      descriptionTemplate: "Shear Studs (for composite deck)",
      unit: "EA",
      quantityGuidance: "Count from beam schedule or estimate 1 stud per foot of beam with composite deck",
      condition: "conditional",
      conditionNote: "Only when composite metal deck is specified",
    },
    {
      csiCode: "07 81 00",
      descriptionTemplate: "Spray-Applied Fireproofing on Steel",
      unit: "SF",
      quantityGuidance: "Surface area of all steel requiring fire rating; beams, columns, connections",
      condition: "conditional",
      conditionNote: "Required when fire rating is specified for steel members",
    },
    {
      csiCode: "09 91 00",
      descriptionTemplate: "Touch-Up Painting on Steel (field touch-up after erection)",
      unit: "LS",
      quantityGuidance: "1 LS — touch-up at connections, welds, and damaged shop paint",
      condition: "always",
    },
    {
      csiCode: "05 12 00",
      descriptionTemplate: "Structural Steel Inspection & Testing (UT, MT)",
      unit: "LS",
      quantityGuidance: "1 LS — required for moment connections and critical welds",
      condition: "conditional",
      conditionNote: "When special inspection is required per structural drawings",
    },
  ],
  constructionNotes: [
    "Structural steel is priced per ton — include all members, connections, and miscellaneous steel in tonnage.",
    "Shop drawings and detailing are typically 8-12 weeks lead time from contract.",
    "Erection sequence must be coordinated with the structural engineer and crane operator.",
    "Fireproofing is a separate trade (Division 07) but must be included when fire rating is required.",
    "Field welding requires certified welders and inspection — this adds significant cost vs. bolted connections.",
    "Galvanizing is required for exposed exterior steel — adds 15-25% to fabrication cost.",
  ],
};

const METALS_STEEL_JOISTS: TradeSpecialty = {
  id: "metals_steel_joists",
  divisionCode: "05",
  csiSubCode: "05 21 00",
  name: "Steel Joists & Deck",
  description: "Open-web steel joists with metal roof or floor deck",
  detectionSignals: [
    "steel joist", "open web", "joist schedule", "joist girder",
    "K-series", "LH-series", "DLH-series", "SJI",
    "metal deck", "roof deck", "floor deck", "composite deck",
    "B-deck", "N-deck", "form deck", "pour stop",
  ],
  relevantSheetTypes: ["structural", "detail", "schedule", "floor_plan"],
  additionalLineItems: [
    {
      csiCode: "05 21 00",
      descriptionTemplate: "Joist Bridging (horizontal and diagonal)",
      unit: "EA",
      quantityGuidance: "Per SJI requirements: typically 1-3 rows of bridging per joist span",
      condition: "always",
    },
    {
      csiCode: "05 21 00",
      descriptionTemplate: "Joist Bearing Plates",
      unit: "EA",
      quantityGuidance: "2 per joist (1 at each end bearing)",
      condition: "always",
    },
    {
      csiCode: "05 31 00",
      descriptionTemplate: "Metal Deck Pour Stops / Edge Angles",
      unit: "LF",
      quantityGuidance: "Perimeter of deck at all openings and edges",
      condition: "always",
    },
    {
      csiCode: "05 31 00",
      descriptionTemplate: "Metal Deck Side Lap Fasteners (screws or welds)",
      unit: "EA",
      quantityGuidance: "Per deck manufacturer's pattern; typically every 12-36\" at side laps",
      condition: "always",
    },
  ],
  constructionNotes: [
    "Steel joists and deck are typically supplied by the same manufacturer as a package.",
    "Joist bridging is required per SJI specifications — it is NOT optional and is often missed in takeoffs.",
    "Composite deck requires shear studs welded through the deck to the beams below.",
    "Deck is measured in SF but priced by gauge and profile — specify correctly from the schedule.",
  ],
};

// ─── Division 07: Thermal & Moisture Protection Specialties ───────────────────

const ROOFING_TPO: TradeSpecialty = {
  id: "roofing_tpo",
  divisionCode: "07",
  csiSubCode: "07 54 23",
  name: "TPO Membrane Roofing",
  description: "Thermoplastic polyolefin single-ply roofing membrane",
  detectionSignals: [
    "TPO", "single-ply", "membrane roof", "mechanically attached",
    "fully adhered", "60 mil", "80 mil", "white roof",
    "cool roof", "TPO membrane",
  ],
  relevantSheetTypes: ["detail", "section", "floor_plan"],
  additionalLineItems: [
    {
      csiCode: "07 22 00",
      descriptionTemplate: "Roof Insulation (polyiso board, multiple layers)",
      unit: "SF",
      quantityGuidance: "Total roof area; specify R-value and number of layers",
      condition: "always",
    },
    {
      csiCode: "07 22 00",
      descriptionTemplate: "Roof Cover Board (HD polyiso or gypsum)",
      unit: "SF",
      quantityGuidance: "Total roof area — installed over insulation, under membrane",
      condition: "always",
    },
    {
      csiCode: "07 54 23",
      descriptionTemplate: "TPO Membrane Flashings (inside/outside corners, pipe boots)",
      unit: "LF",
      quantityGuidance: "Perimeter + all penetrations + curbs; typically 20-30% of roof perimeter",
      condition: "always",
    },
    {
      csiCode: "07 71 00",
      descriptionTemplate: "Metal Edge / Coping at Roof Perimeter",
      unit: "LF",
      quantityGuidance: "Total roof perimeter",
      condition: "always",
    },
    {
      csiCode: "07 54 23",
      descriptionTemplate: "Walkway Pads (for rooftop equipment access)",
      unit: "SF",
      quantityGuidance: "Paths from roof access to all rooftop equipment; typically 3' wide",
      condition: "conditional",
      conditionNote: "When rooftop equipment requires maintenance access",
    },
    {
      csiCode: "07 72 00",
      descriptionTemplate: "Roof Drains / Scuppers",
      unit: "EA",
      quantityGuidance: "Count from roof plan; typically 1 drain per 10,000 SF",
      condition: "always",
    },
  ],
  constructionNotes: [
    "TPO membrane is available in 45, 60, and 80 mil — thicker membranes cost more but last longer.",
    "Insulation is typically polyisocyanurate (polyiso) in multiple layers with staggered joints.",
    "Mechanically attached systems use plates and screws; fully adhered uses adhesive — different costs.",
    "All penetrations (pipes, curbs, drains) require custom flashing — count each one.",
    "Metal edge/coping at the perimeter is a separate item from the membrane.",
  ],
};

const ROOFING_METAL: TradeSpecialty = {
  id: "roofing_metal",
  divisionCode: "07",
  csiSubCode: "07 41 00",
  name: "Metal Roofing",
  description: "Standing seam or through-fastened metal roof panels",
  detectionSignals: [
    "standing seam", "metal roof", "metal panel", "SSR",
    "through-fastened", "concealed fastener", "clip",
    "ridge cap", "hip cap", "metal roofing",
    "Galvalume", "Kynar", "PVDF",
  ],
  relevantSheetTypes: ["detail", "section", "elevation", "floor_plan"],
  additionalLineItems: [
    {
      csiCode: "07 41 00",
      descriptionTemplate: "Metal Roof Panel Clips (fixed and sliding)",
      unit: "EA",
      quantityGuidance: "1 clip per panel per purlin crossing; count panels × purlins",
      condition: "always",
    },
    {
      csiCode: "07 41 00",
      descriptionTemplate: "Ridge Cap / Hip Cap",
      unit: "LF",
      quantityGuidance: "Total LF of ridge and hip lines from roof plan",
      condition: "always",
    },
    {
      csiCode: "07 41 00",
      descriptionTemplate: "Eave Trim / Drip Edge",
      unit: "LF",
      quantityGuidance: "Total LF of eave line from roof plan",
      condition: "always",
    },
    {
      csiCode: "07 41 00",
      descriptionTemplate: "Gable Trim / Rake Trim",
      unit: "LF",
      quantityGuidance: "Total LF of gable/rake edges",
      condition: "always",
    },
    {
      csiCode: "07 41 00",
      descriptionTemplate: "Valley Flashing",
      unit: "LF",
      quantityGuidance: "Total LF of roof valleys",
      condition: "conditional",
      conditionNote: "Only if roof has valley conditions",
    },
    {
      csiCode: "07 62 00",
      descriptionTemplate: "Roof Underlayment (synthetic or ice & water shield)",
      unit: "SF",
      quantityGuidance: "Total roof area; ice & water at eaves and valleys",
      condition: "always",
    },
  ],
  constructionNotes: [
    "Standing seam panels use concealed clips — no exposed fasteners on the roof surface.",
    "Panel length affects cost: longer panels reduce end laps but require special handling.",
    "Trim and flashing are typically 15-25% of the total metal roofing cost — do not underestimate.",
    "Galvalume (bare metal) is cheapest; Kynar/PVDF coatings add color and durability at higher cost.",
    "Thermal movement in long panels requires sliding clips — fixed clips only at one end.",
  ],
};

// ─── Division 09: Finishes Specialties ────────────────────────────────────────

const FINISHES_DRYWALL: TradeSpecialty = {
  id: "finishes_drywall",
  divisionCode: "09",
  csiSubCode: "09 29 00",
  name: "Gypsum Board / Drywall",
  description: "Interior wall and ceiling finishing with gypsum board",
  detectionSignals: [
    "gypsum board", "drywall", "GWB", "sheetrock",
    "Type X", "moisture resistant", "abuse resistant",
    "level 4 finish", "level 5 finish", "partition type",
    "wall type schedule", "furring", "resilient channel",
  ],
  relevantSheetTypes: ["floor_plan", "detail", "section", "schedule"],
  additionalLineItems: [
    {
      csiCode: "09 22 16",
      descriptionTemplate: "Metal Stud Framing (non-load-bearing partitions)",
      unit: "SF",
      quantityGuidance: "Wall area: wall LF × height; specify gauge and spacing from wall type schedule",
      condition: "always",
    },
    {
      csiCode: "09 29 00",
      descriptionTemplate: "Drywall Joint Compound & Tape",
      unit: "SF",
      quantityGuidance: "Match total drywall SF — compound and tape are per SF of board",
      condition: "always",
    },
    {
      csiCode: "09 29 00",
      descriptionTemplate: "Corner Bead (metal or vinyl)",
      unit: "LF",
      quantityGuidance: "All outside corners: count corners × wall height",
      condition: "always",
    },
    {
      csiCode: "09 22 16",
      descriptionTemplate: "Acoustical Insulation in Partitions (fiberglass batts)",
      unit: "SF",
      quantityGuidance: "Wall area of all rated or acoustical partitions from wall type schedule",
      condition: "conditional",
      conditionNote: "When wall type schedule specifies insulation (STC-rated walls)",
    },
  ],
  constructionNotes: [
    "Drywall is measured in SF but priced differently by type: standard, Type X (fire), moisture-resistant, abuse-resistant.",
    "Level of finish matters: Level 4 (standard) vs Level 5 (skim coat for critical lighting) — different costs.",
    "Metal stud framing is typically included with the drywall subcontractor's scope.",
    "Acoustical insulation in rated partitions is often missed — check the wall type schedule.",
    "Ceiling drywall costs more to install than wall drywall due to overhead work and scaffolding.",
  ],
};

// ─── Division 21: Fire Suppression Specialties ────────────────────────────────

const FIRE_SUPPRESSION_WET: TradeSpecialty = {
  id: "fire_suppression_wet",
  divisionCode: "21",
  csiSubCode: "21 13 13",
  name: "Wet Pipe Sprinkler System",
  description: "Standard fire sprinkler system with water-filled pipes",
  detectionSignals: [
    "sprinkler", "fire sprinkler", "wet pipe", "sprinkler head",
    "sprinkler riser", "fire department connection", "FDC",
    "sprinkler layout", "pendant head", "upright head",
    "concealed head", "NFPA 13",
  ],
  relevantSheetTypes: ["mep", "floor_plan", "detail"],
  additionalLineItems: [
    {
      csiCode: "21 13 13",
      descriptionTemplate: "Sprinkler Riser Assembly",
      unit: "EA",
      quantityGuidance: "Typically 1 per zone; count from riser diagram",
      condition: "always",
    },
    {
      csiCode: "21 13 13",
      descriptionTemplate: "Fire Department Connection (FDC)",
      unit: "EA",
      quantityGuidance: "Typically 1 per building; verify from site plan",
      condition: "always",
    },
    {
      csiCode: "21 13 13",
      descriptionTemplate: "Sprinkler System Flow Switch & Tamper Switch",
      unit: "EA",
      quantityGuidance: "1 flow switch + 1 tamper switch per zone",
      condition: "always",
    },
    {
      csiCode: "21 13 13",
      descriptionTemplate: "Sprinkler Inspector's Test Connection",
      unit: "EA",
      quantityGuidance: "1 per zone at the hydraulically most remote point",
      condition: "always",
    },
    {
      csiCode: "21 12 00",
      descriptionTemplate: "Fire Pump (if required by hydraulic calculation)",
      unit: "EA",
      quantityGuidance: "1 EA if building water pressure is insufficient; verify from fire protection drawings",
      condition: "conditional",
      conditionNote: "Only when hydraulic calculations require a fire pump",
    },
  ],
  constructionNotes: [
    "Wet pipe is the most common and least expensive sprinkler system type.",
    "Sprinkler heads are counted individually but piping is measured in LF by diameter.",
    "The riser assembly includes the alarm valve, gauges, drains, and test connections.",
    "Fire department connections (FDC) are required at the building exterior.",
    "Hydraulic calculations determine pipe sizes — the sprinkler contractor provides these.",
  ],
};

// ─── Division 23: HVAC Specialties ────────────────────────────────────────────

const HVAC_KITCHEN_HOOD: TradeSpecialty = {
  id: "hvac_kitchen_hood",
  divisionCode: "23",
  csiSubCode: "23 38 13",
  name: "Commercial Kitchen Hood System",
  description: "Type I grease hoods with exhaust, makeup air, and fire suppression",
  detectionSignals: [
    "kitchen hood", "Type I hood", "Type II hood", "grease hood",
    "exhaust hood", "makeup air", "MUA", "Ansul",
    "kitchen exhaust", "grease duct", "UL 300",
    "commercial kitchen", "cooking equipment",
  ],
  relevantSheetTypes: ["mep", "hvac", "floor_plan", "detail"],
  additionalLineItems: [
    {
      csiCode: "23 38 13",
      descriptionTemplate: "Kitchen Exhaust Ductwork (welded black steel, grease-rated)",
      unit: "LF",
      quantityGuidance: "From hood to roof exhaust fan; measure duct run from drawings",
      condition: "always",
    },
    {
      csiCode: "23 38 13",
      descriptionTemplate: "Kitchen Makeup Air Unit (tempered outdoor air)",
      unit: "EA",
      quantityGuidance: "1 MUA per hood system; CFM matches exhaust minus transfer air",
      condition: "always",
    },
    {
      csiCode: "23 38 13",
      descriptionTemplate: "Makeup Air Ductwork",
      unit: "LF",
      quantityGuidance: "From MUA unit to kitchen distribution; measure from drawings",
      condition: "always",
    },
    {
      csiCode: "21 22 00",
      descriptionTemplate: "Kitchen Hood Fire Suppression System (Ansul/wet chemical)",
      unit: "EA",
      quantityGuidance: "1 system per hood; includes nozzles, piping, tank, pull station",
      condition: "always",
    },
    {
      csiCode: "23 38 13",
      descriptionTemplate: "Roof-Mounted Kitchen Exhaust Fan (upblast type)",
      unit: "EA",
      quantityGuidance: "1 per hood exhaust duct run",
      condition: "always",
    },
    {
      csiCode: "23 38 13",
      descriptionTemplate: "Grease Filters / Baffle Filters",
      unit: "EA",
      quantityGuidance: "Count filter slots in hood; typically 1 per 20\" of hood length",
      condition: "always",
    },
    {
      csiCode: "23 38 13",
      descriptionTemplate: "Hood Light Fixtures (vapor-proof)",
      unit: "EA",
      quantityGuidance: "Typically 1 per 4-6 LF of hood length",
      condition: "always",
    },
    {
      csiCode: "22 15 00",
      descriptionTemplate: "Grease Interceptor / Grease Trap",
      unit: "EA",
      quantityGuidance: "1 per kitchen; size based on fixture count and flow rate",
      condition: "always",
    },
  ],
  constructionNotes: [
    "Kitchen hood systems involve 4 trades: sheet metal (hood/duct), HVAC (MUA), fire protection (Ansul), and plumbing (grease trap).",
    "Type I hoods are for grease-producing equipment; Type II are for heat/steam only — different requirements.",
    "Exhaust ductwork from a Type I hood must be welded black steel (not galvanized) per code.",
    "Makeup air must be tempered in cold climates — this requires heating capacity in the MUA unit.",
    "The Ansul fire suppression system is a separate specialty sub — it includes the tank, piping, nozzles, and pull station.",
    "Grease interceptors are sized by the plumbing engineer based on fixture units and local code.",
    "Kitchen hood systems are one of the most commonly under-estimated items in commercial construction.",
  ],
};

const HVAC_VRF: TradeSpecialty = {
  id: "hvac_vrf",
  divisionCode: "23",
  csiSubCode: "23 82 00",
  name: "VRF/VRV System",
  description: "Variable refrigerant flow HVAC system with heat recovery",
  detectionSignals: [
    "VRF", "VRV", "variable refrigerant", "heat recovery",
    "branch selector", "refnet", "outdoor unit",
    "indoor unit", "refrigerant piping", "Daikin",
    "Mitsubishi", "LG Multi V", "Samsung DVM",
  ],
  relevantSheetTypes: ["mep", "hvac", "floor_plan", "detail"],
  additionalLineItems: [
    {
      csiCode: "23 82 00",
      descriptionTemplate: "VRF Refrigerant Piping (liquid + suction lines)",
      unit: "LF",
      quantityGuidance: "Measure from outdoor unit to each branch selector and from branch to each indoor unit",
      condition: "always",
    },
    {
      csiCode: "23 82 00",
      descriptionTemplate: "VRF Branch Selector Boxes",
      unit: "EA",
      quantityGuidance: "Count from piping diagram; typically 1 per 4-8 indoor units",
      condition: "always",
    },
    {
      csiCode: "23 82 00",
      descriptionTemplate: "VRF Condensate Piping & Pump",
      unit: "LF",
      quantityGuidance: "From each indoor unit to nearest drain; include condensate pumps where gravity drain is not possible",
      condition: "always",
    },
    {
      csiCode: "23 09 00",
      descriptionTemplate: "VRF System Controller / BAS Integration",
      unit: "EA",
      quantityGuidance: "1 central controller + integration to building automation system",
      condition: "always",
    },
    {
      csiCode: "23 82 00",
      descriptionTemplate: "VRF Refrigerant Charge (additional beyond factory charge)",
      unit: "LB",
      quantityGuidance: "Based on total piping length; manufacturer provides charge tables",
      condition: "always",
    },
    {
      csiCode: "23 82 00",
      descriptionTemplate: "VRF System Commissioning & Start-Up",
      unit: "LS",
      quantityGuidance: "1 LS — manufacturer-authorized start-up required for warranty",
      condition: "always",
    },
  ],
  constructionNotes: [
    "VRF systems use refrigerant piping instead of ductwork for distribution — piping is a major cost component.",
    "Refrigerant piping must be brazed by certified technicians — this is specialty labor.",
    "Branch selector boxes route refrigerant to individual zones — they require access for maintenance.",
    "Factory-authorized commissioning is required for the manufacturer's warranty — this is a separate cost.",
    "VRF systems are typically 15-25% more expensive to install than conventional systems but offer energy savings.",
  ],
};

// ─── Division 26: Electrical Specialties ──────────────────────────────────────

const ELECTRICAL_POWER: TradeSpecialty = {
  id: "electrical_power",
  divisionCode: "26",
  csiSubCode: "26 20 00",
  name: "Power Distribution",
  description: "Electrical service, switchgear, panelboards, and branch wiring",
  detectionSignals: [
    "electrical panel", "panelboard", "switchgear", "transformer",
    "panel schedule", "one-line diagram", "single-line",
    "MDP", "main distribution", "bus duct", "busway",
    "ATS", "automatic transfer", "generator",
  ],
  relevantSheetTypes: ["electrical", "mep", "detail", "schedule"],
  additionalLineItems: [
    {
      csiCode: "26 05 00",
      descriptionTemplate: "Conduit & Wire Homeruns (panel to first device)",
      unit: "LF",
      quantityGuidance: "Estimate average homerun length × number of circuits from panel schedule",
      condition: "always",
    },
    {
      csiCode: "26 05 00",
      descriptionTemplate: "Branch Circuit Wiring (device to device)",
      unit: "LF",
      quantityGuidance: "Count devices × average wire run between devices",
      condition: "always",
    },
    {
      csiCode: "26 27 26",
      descriptionTemplate: "Grounding & Bonding System",
      unit: "LS",
      quantityGuidance: "1 LS — includes ground rods, conductors, bonding jumpers per NEC",
      condition: "always",
    },
    {
      csiCode: "26 05 00",
      descriptionTemplate: "Electrical Boxes, Covers & Device Plates",
      unit: "EA",
      quantityGuidance: "1 box per device location; count all receptacles, switches, and junction boxes",
      condition: "always",
    },
    {
      csiCode: "26 32 00",
      descriptionTemplate: "Emergency Generator",
      unit: "EA",
      quantityGuidance: "1 EA if shown on one-line diagram; size from generator schedule",
      condition: "conditional",
      conditionNote: "Only when emergency/standby power is specified",
    },
  ],
  constructionNotes: [
    "Electrical work is measured in LF of conduit and wire, plus EA for devices and equipment.",
    "Panel schedules show circuit loading — use them to count circuits and estimate wire runs.",
    "Conduit type matters: EMT (cheapest), IMC, RGS (most expensive) — check the spec.",
    "Wire size is determined by circuit amperage and run length — longer runs may need upsizing.",
    "Grounding and bonding is code-required and often underestimated.",
  ],
};

const ELECTRICAL_SOLAR: TradeSpecialty = {
  id: "electrical_solar",
  divisionCode: "26",
  csiSubCode: "26 31 00",
  name: "Solar Photovoltaic",
  description: "Rooftop or ground-mounted solar panel systems",
  detectionSignals: [
    "solar", "photovoltaic", "PV", "solar panel",
    "inverter", "solar array", "PV layout",
    "string inverter", "microinverter", "racking",
    "solar mounting", "net metering",
  ],
  relevantSheetTypes: ["electrical", "floor_plan", "detail", "site_plan"],
  additionalLineItems: [
    {
      csiCode: "26 31 00",
      descriptionTemplate: "Solar Panel Racking / Mounting System",
      unit: "EA",
      quantityGuidance: "1 rack set per panel; or per-SF of array area",
      condition: "always",
    },
    {
      csiCode: "26 31 00",
      descriptionTemplate: "DC Wiring (panel to inverter)",
      unit: "LF",
      quantityGuidance: "String length × number of strings; measure from array to inverter location",
      condition: "always",
    },
    {
      csiCode: "26 31 00",
      descriptionTemplate: "AC Wiring (inverter to panel/grid)",
      unit: "LF",
      quantityGuidance: "From inverter to electrical panel; measure from drawings",
      condition: "always",
    },
    {
      csiCode: "26 31 00",
      descriptionTemplate: "Rapid Shutdown System (NEC 690.12 compliance)",
      unit: "LS",
      quantityGuidance: "1 LS — required by code for rooftop systems",
      condition: "always",
    },
    {
      csiCode: "26 31 00",
      descriptionTemplate: "Solar System Monitoring & Commissioning",
      unit: "LS",
      quantityGuidance: "1 LS — includes monitoring hardware and initial commissioning",
      condition: "always",
    },
  ],
  constructionNotes: [
    "Solar PV systems require structural analysis of the roof to verify it can support the additional load.",
    "Racking/mounting is a significant cost — ballasted, mechanically attached, or integrated systems have different costs.",
    "Rapid shutdown is required by NEC 690.12 — this adds module-level electronics.",
    "Inverter type affects cost: string inverters are cheaper, microinverters are more expensive but offer panel-level optimization.",
    "Utility interconnection and net metering agreements are required before system activation.",
  ],
};

// ─── Division 31-32: Sitework Specialties ─────────────────────────────────────

const SITEWORK_PAVING: TradeSpecialty = {
  id: "sitework_paving",
  divisionCode: "32",
  csiSubCode: "32 12 16",
  name: "Asphalt Paving",
  description: "Asphalt pavement for parking lots, drives, and roads",
  detectionSignals: [
    "asphalt", "HMA", "hot mix", "pavement",
    "parking lot", "drive lane", "paving section",
    "base course", "wearing course", "tack coat",
    "pavement marking", "striping",
  ],
  relevantSheetTypes: ["site_plan", "detail", "section"],
  additionalLineItems: [
    {
      csiCode: "32 12 16",
      descriptionTemplate: "Aggregate Base Course (compacted crushed stone)",
      unit: "SY",
      quantityGuidance: "Total paved area; specify depth from pavement section detail",
      condition: "always",
    },
    {
      csiCode: "32 12 16",
      descriptionTemplate: "Tack Coat (between asphalt lifts)",
      unit: "SY",
      quantityGuidance: "Total paved area — applied between base course and wearing course",
      condition: "always",
    },
    {
      csiCode: "32 17 23",
      descriptionTemplate: "Pavement Markings / Striping",
      unit: "LF",
      quantityGuidance: "Parking stall lines, lane markings, arrows, handicap symbols from site plan",
      condition: "always",
    },
    {
      csiCode: "32 16 00",
      descriptionTemplate: "Concrete Curb & Gutter",
      unit: "LF",
      quantityGuidance: "Total LF of curb from site plan; include curb cuts for ADA ramps",
      condition: "conditional",
      conditionNote: "When curb and gutter is shown on site plan",
    },
    {
      csiCode: "32 12 16",
      descriptionTemplate: "Asphalt Speed Bumps / Humps",
      unit: "EA",
      quantityGuidance: "Count from site plan",
      condition: "conditional",
      conditionNote: "Only if speed bumps are shown on site plan",
    },
  ],
  constructionNotes: [
    "Asphalt paving requires a properly compacted aggregate base — the base is often more expensive than the asphalt.",
    "Tack coat between lifts is required for proper bonding — it is a separate line item.",
    "Pavement markings/striping are done after the asphalt cures — typically a separate subcontractor.",
    "ADA-compliant parking stalls, access aisles, and ramps must be included per code.",
    "Seasonal restrictions apply: asphalt cannot be placed in cold weather (typically below 40°F).",
  ],
};

// ─── Division 08: Openings Specialties ────────────────────────────────────────

const OPENINGS_CURTAIN_WALL: TradeSpecialty = {
  id: "openings_curtain_wall",
  divisionCode: "08",
  csiSubCode: "08 44 00",
  name: "Curtain Wall / Storefront",
  description: "Aluminum-framed glass wall systems for building facades",
  detectionSignals: [
    "curtain wall", "storefront", "aluminum framing",
    "mullion", "transom", "structural glazing",
    "unitized", "stick-built", "spandrel glass",
    "vision glass", "curtainwall", "window wall",
  ],
  relevantSheetTypes: ["elevation", "detail", "section"],
  additionalLineItems: [
    {
      csiCode: "08 44 00",
      descriptionTemplate: "Curtain Wall Shop Drawings & Engineering",
      unit: "LS",
      quantityGuidance: "1 LS — curtain wall subcontractor provides engineering and shop drawings",
      condition: "always",
    },
    {
      csiCode: "08 44 00",
      descriptionTemplate: "Curtain Wall Anchor System (to structure)",
      unit: "EA",
      quantityGuidance: "Count anchor points from details; typically at each mullion-to-structure connection",
      condition: "always",
    },
    {
      csiCode: "08 44 00",
      descriptionTemplate: "Curtain Wall Perimeter Sealant (4-sided)",
      unit: "LF",
      quantityGuidance: "Total perimeter of curtain wall system at structure interface",
      condition: "always",
    },
    {
      csiCode: "07 84 00",
      descriptionTemplate: "Firestopping at Curtain Wall / Floor Edge",
      unit: "LF",
      quantityGuidance: "LF of curtain wall at each floor line; required for fire compartmentalization",
      condition: "always",
    },
    {
      csiCode: "08 80 00",
      descriptionTemplate: "Insulated Glass Units (IGU) — vision and spandrel",
      unit: "SF",
      quantityGuidance: "Total glass area from elevation drawings; separate vision from spandrel",
      condition: "always",
    },
  ],
  constructionNotes: [
    "Curtain wall is a specialty subcontract — the sub provides engineering, fabrication, and installation.",
    "Lead time for curtain wall is typically 12-20 weeks from shop drawing approval.",
    "Firestopping at each floor line is code-required and is often a separate subcontractor.",
    "Structural silicone glazing (SSG) systems have different requirements than mechanically captured systems.",
    "Mock-up panels are often required for quality assurance — include in the estimate.",
  ],
};

// ─── Master Registry ──────────────────────────────────────────────────────────

/**
 * All registered trade specialties, indexed by their unique ID.
 */
export const TRADE_SPECIALTIES: Record<string, TradeSpecialty> = {
  // Division 03 — Concrete
  concrete_tilt_up: CONCRETE_TILT_UP,
  concrete_cast_in_place: CONCRETE_CAST_IN_PLACE,
  concrete_precast: CONCRETE_PRECAST,
  concrete_post_tension: CONCRETE_POST_TENSION,

  // Division 04 — Masonry
  masonry_cmu: MASONRY_CMU,
  masonry_brick_veneer: MASONRY_BRICK_VENEER,

  // Division 05 — Metals
  metals_structural_steel: METALS_STRUCTURAL_STEEL,
  metals_steel_joists: METALS_STEEL_JOISTS,

  // Division 07 — Thermal & Moisture Protection
  roofing_tpo: ROOFING_TPO,
  roofing_metal: ROOFING_METAL,

  // Division 08 — Openings
  openings_curtain_wall: OPENINGS_CURTAIN_WALL,

  // Division 09 — Finishes
  finishes_drywall: FINISHES_DRYWALL,

  // Division 21 — Fire Suppression
  fire_suppression_wet: FIRE_SUPPRESSION_WET,

  // Division 23 — HVAC
  hvac_kitchen_hood: HVAC_KITCHEN_HOOD,
  hvac_vrf: HVAC_VRF,

  // Division 26 — Electrical
  electrical_power: ELECTRICAL_POWER,
  electrical_solar: ELECTRICAL_SOLAR,

  // Division 32 — Exterior Improvements
  sitework_paving: SITEWORK_PAVING,
};

/**
 * Get all specialties for a given CSI division code.
 */
export function getSpecialtiesForDivision(divisionCode: string): TradeSpecialty[] {
  return Object.values(TRADE_SPECIALTIES).filter(s => s.divisionCode === divisionCode);
}

/**
 * Get a flat list of all specialties grouped by division for UI display.
 */
export function getSpecialtiesByDivision(): Record<string, TradeSpecialty[]> {
  const grouped: Record<string, TradeSpecialty[]> = {};
  for (const specialty of Object.values(TRADE_SPECIALTIES)) {
    if (!grouped[specialty.divisionCode]) {
      grouped[specialty.divisionCode] = [];
    }
    grouped[specialty.divisionCode].push(specialty);
  }
  return grouped;
}

/**
 * Build an AI prompt injection for detected specialties.
 * This is appended to the system prompt when generating takeoff line items.
 */
export function buildSpecialtyPromptInjection(specialtyIds: string[]): string {
  if (specialtyIds.length === 0) return "";

  const specialties = specialtyIds
    .map(id => TRADE_SPECIALTIES[id])
    .filter(Boolean);

  if (specialties.length === 0) return "";

  let prompt = `\n\n## TRADE SPECIALTY INTELLIGENCE — CRITICAL\n`;
  prompt += `The following trade specialties have been detected or selected for this project. `;
  prompt += `You MUST generate additional line items specific to these specialties that a specialty contractor would include, `;
  prompt += `even if they are NOT explicitly shown on the drawing.\n`;

  for (const spec of specialties) {
    prompt += `\n### ${spec.name} (${spec.csiSubCode || spec.divisionCode})\n`;
    prompt += `${spec.description}\n\n`;

    prompt += `**Construction Considerations:**\n`;
    for (const note of spec.constructionNotes) {
      prompt += `- ${note}\n`;
    }

    prompt += `\n**Additional Line Items to Generate:**\n`;
    for (const item of spec.additionalLineItems) {
      if (item.condition === "always") {
        prompt += `- REQUIRED: "${item.descriptionTemplate}" (${item.unit}) — ${item.quantityGuidance}\n`;
      } else {
        prompt += `- IF APPLICABLE: "${item.descriptionTemplate}" (${item.unit}) — ${item.quantityGuidance} [${item.conditionNote}]\n`;
      }
    }
  }

  prompt += `\n**IMPORTANT:** Generate these specialty items IN ADDITION to the standard takeoff items you would normally extract. `;
  prompt += `If you cannot determine an exact quantity from the drawing, use your estimating experience to provide a reasonable estimate `;
  prompt += `and note it in the "notes" field with your reasoning. Set confidence lower (50-70) for estimated quantities.\n`;

  return prompt;
}

/**
 * Build a specialty detection prompt for the AI to analyze a drawing
 * and identify which specialties are present.
 */
export function buildSpecialtyDetectionPrompt(divisionCodes: string[]): string {
  const relevantSpecialties = divisionCodes.flatMap(code => getSpecialtiesForDivision(code));
  if (relevantSpecialties.length === 0) return "";

  let prompt = `\n\nAlso identify which of these trade specialties are present on this drawing:\n`;
  for (const spec of relevantSpecialties) {
    prompt += `- "${spec.id}": ${spec.name} — look for: ${spec.detectionSignals.slice(0, 5).join(", ")}\n`;
  }
  prompt += `\nReturn detected specialties as a "detectedSpecialties" array of specialty IDs in your response.\n`;

  return prompt;
}
