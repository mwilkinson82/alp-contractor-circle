/**
 * CSI MasterFormat 2024 — All 50 Divisions
 *
 * The Construction Specifications Institute (CSI) MasterFormat is the standard
 * for organizing construction specifications, cost estimates, and project manuals.
 * These divisions provide a pre-built WBS library for the CPM scheduler.
 */

export interface CsiDivision {
  code: string;       // e.g. "03"
  name: string;       // e.g. "Concrete"
  fullName: string;   // e.g. "Division 03 — Concrete"
  group: CsiGroup;    // Grouping for color coding
}

export type CsiGroup =
  | "general"       // Div 00-01
  | "sitework"      // Div 02, 31-35
  | "concrete"      // Div 03
  | "masonry"       // Div 04
  | "metals"        // Div 05
  | "wood"          // Div 06
  | "thermal"       // Div 07
  | "openings"      // Div 08
  | "finishes"      // Div 09
  | "specialties"   // Div 10-14
  | "mechanical"    // Div 21-23, 25
  | "electrical"    // Div 26-28
  | "infrastructure"// Div 31-35
  | "process"       // Div 40-49
  | "reserved";     // Unassigned

/** All 50 CSI MasterFormat divisions */
export const CSI_DIVISIONS: CsiDivision[] = [
  // ── Procurement & Contracting ─────────────────────────────────────────────
  { code: "00", name: "Procurement & Contracting", fullName: "Division 00 — Procurement & Contracting Requirements", group: "general" },

  // ── General Requirements ──────────────────────────────────────────────────
  { code: "01", name: "General Requirements", fullName: "Division 01 — General Requirements", group: "general" },

  // ── Existing Conditions ───────────────────────────────────────────────────
  { code: "02", name: "Existing Conditions", fullName: "Division 02 — Existing Conditions", group: "sitework" },

  // ── Concrete ──────────────────────────────────────────────────────────────
  { code: "03", name: "Concrete", fullName: "Division 03 — Concrete", group: "concrete" },

  // ── Masonry ───────────────────────────────────────────────────────────────
  { code: "04", name: "Masonry", fullName: "Division 04 — Masonry", group: "masonry" },

  // ── Metals ────────────────────────────────────────────────────────────────
  { code: "05", name: "Metals", fullName: "Division 05 — Metals", group: "metals" },

  // ── Wood, Plastics & Composites ───────────────────────────────────────────
  { code: "06", name: "Wood, Plastics & Composites", fullName: "Division 06 — Wood, Plastics & Composites", group: "wood" },

  // ── Thermal & Moisture Protection ─────────────────────────────────────────
  { code: "07", name: "Thermal & Moisture Protection", fullName: "Division 07 — Thermal & Moisture Protection", group: "thermal" },

  // ── Openings ──────────────────────────────────────────────────────────────
  { code: "08", name: "Openings", fullName: "Division 08 — Openings", group: "openings" },

  // ── Finishes ──────────────────────────────────────────────────────────────
  { code: "09", name: "Finishes", fullName: "Division 09 — Finishes", group: "finishes" },

  // ── Specialties ───────────────────────────────────────────────────────────
  { code: "10", name: "Specialties", fullName: "Division 10 — Specialties", group: "specialties" },

  // ── Equipment ─────────────────────────────────────────────────────────────
  { code: "11", name: "Equipment", fullName: "Division 11 — Equipment", group: "specialties" },

  // ── Furnishings ───────────────────────────────────────────────────────────
  { code: "12", name: "Furnishings", fullName: "Division 12 — Furnishings", group: "specialties" },

  // ── Special Construction ──────────────────────────────────────────────────
  { code: "13", name: "Special Construction", fullName: "Division 13 — Special Construction", group: "specialties" },

  // ── Conveying Equipment ───────────────────────────────────────────────────
  { code: "14", name: "Conveying Equipment", fullName: "Division 14 — Conveying Equipment", group: "specialties" },

  // ── Reserved (15-19) ──────────────────────────────────────────────────────
  { code: "15", name: "Reserved for Future", fullName: "Division 15 — Reserved", group: "reserved" },
  { code: "16", name: "Reserved for Future", fullName: "Division 16 — Reserved", group: "reserved" },
  { code: "17", name: "Reserved for Future", fullName: "Division 17 — Reserved", group: "reserved" },
  { code: "18", name: "Reserved for Future", fullName: "Division 18 — Reserved", group: "reserved" },
  { code: "19", name: "Reserved for Future", fullName: "Division 19 — Reserved", group: "reserved" },

  // ── Reserved (20) ─────────────────────────────────────────────────────────
  { code: "20", name: "Reserved for Future", fullName: "Division 20 — Reserved", group: "reserved" },

  // ── Fire Suppression ──────────────────────────────────────────────────────
  { code: "21", name: "Fire Suppression", fullName: "Division 21 — Fire Suppression", group: "mechanical" },

  // ── Plumbing ──────────────────────────────────────────────────────────────
  { code: "22", name: "Plumbing", fullName: "Division 22 — Plumbing", group: "mechanical" },

  // ── HVAC ──────────────────────────────────────────────────────────────────
  { code: "23", name: "Heating, Ventilating & Air Conditioning", fullName: "Division 23 — HVAC", group: "mechanical" },

  // ── Reserved (24) ─────────────────────────────────────────────────────────
  { code: "24", name: "Reserved for Future", fullName: "Division 24 — Reserved", group: "reserved" },

  // ── Integrated Automation ─────────────────────────────────────────────────
  { code: "25", name: "Integrated Automation", fullName: "Division 25 — Integrated Automation", group: "mechanical" },

  // ── Electrical ────────────────────────────────────────────────────────────
  { code: "26", name: "Electrical", fullName: "Division 26 — Electrical", group: "electrical" },

  // ── Communications ────────────────────────────────────────────────────────
  { code: "27", name: "Communications", fullName: "Division 27 — Communications", group: "electrical" },

  // ── Electronic Safety & Security ──────────────────────────────────────────
  { code: "28", name: "Electronic Safety & Security", fullName: "Division 28 — Electronic Safety & Security", group: "electrical" },

  // ── Reserved (29-30) ──────────────────────────────────────────────────────
  { code: "29", name: "Reserved for Future", fullName: "Division 29 — Reserved", group: "reserved" },
  { code: "30", name: "Reserved for Future", fullName: "Division 30 — Reserved", group: "reserved" },

  // ── Earthwork ─────────────────────────────────────────────────────────────
  { code: "31", name: "Earthwork", fullName: "Division 31 — Earthwork", group: "infrastructure" },

  // ── Exterior Improvements ─────────────────────────────────────────────────
  { code: "32", name: "Exterior Improvements", fullName: "Division 32 — Exterior Improvements", group: "infrastructure" },

  // ── Utilities ─────────────────────────────────────────────────────────────
  { code: "33", name: "Utilities", fullName: "Division 33 — Utilities", group: "infrastructure" },

  // ── Transportation ────────────────────────────────────────────────────────
  { code: "34", name: "Transportation", fullName: "Division 34 — Transportation", group: "infrastructure" },

  // ── Waterway & Marine ─────────────────────────────────────────────────────
  { code: "35", name: "Waterway & Marine Construction", fullName: "Division 35 — Waterway & Marine Construction", group: "infrastructure" },

  // ── Reserved (36-39) ──────────────────────────────────────────────────────
  { code: "36", name: "Reserved for Future", fullName: "Division 36 — Reserved", group: "reserved" },
  { code: "37", name: "Reserved for Future", fullName: "Division 37 — Reserved", group: "reserved" },
  { code: "38", name: "Reserved for Future", fullName: "Division 38 — Reserved", group: "reserved" },
  { code: "39", name: "Reserved for Future", fullName: "Division 39 — Reserved", group: "reserved" },

  // ── Process Integration ───────────────────────────────────────────────────
  { code: "40", name: "Process Integration", fullName: "Division 40 — Process Integration", group: "process" },

  // ── Material Processing & Handling ────────────────────────────────────────
  { code: "41", name: "Material Processing & Handling Equipment", fullName: "Division 41 — Material Processing & Handling Equipment", group: "process" },

  // ── Process Heating, Cooling & Drying ─────────────────────────────────────
  { code: "42", name: "Process Heating, Cooling & Drying", fullName: "Division 42 — Process Heating, Cooling & Drying Equipment", group: "process" },

  // ── Process Gas & Liquid Handling ─────────────────────────────────────────
  { code: "43", name: "Process Gas & Liquid Handling", fullName: "Division 43 — Process Gas & Liquid Handling, Purification & Storage Equipment", group: "process" },

  // ── Pollution & Waste Control ─────────────────────────────────────────────
  { code: "44", name: "Pollution & Waste Control Equipment", fullName: "Division 44 — Pollution & Waste Control Equipment", group: "process" },

  // ── Industry-Specific Manufacturing ───────────────────────────────────────
  { code: "45", name: "Industry-Specific Manufacturing Equipment", fullName: "Division 45 — Industry-Specific Manufacturing Equipment", group: "process" },

  // ── Water & Wastewater Equipment ──────────────────────────────────────────
  { code: "46", name: "Water & Wastewater Equipment", fullName: "Division 46 — Water & Wastewater Equipment", group: "process" },

  // ── Reserved (47) ─────────────────────────────────────────────────────────
  { code: "47", name: "Reserved for Future", fullName: "Division 47 — Reserved", group: "reserved" },

  // ── Electrical Power Generation ───────────────────────────────────────────
  { code: "48", name: "Electrical Power Generation", fullName: "Division 48 — Electrical Power Generation", group: "process" },

  // ── Reserved (49) ─────────────────────────────────────────────────────────
  { code: "49", name: "Reserved for Future", fullName: "Division 49 — Reserved", group: "reserved" },
];

/** Only active (non-reserved) divisions for the default picker */
export const CSI_ACTIVE_DIVISIONS = CSI_DIVISIONS.filter(d => d.group !== "reserved");

/**
 * Color palette for WBS group bands.
 * Each CSI group gets a distinct background color for Gantt grouping rows.
 * Colors are chosen for readability with dark text.
 */
export const WBS_GROUP_COLORS: Record<CsiGroup, { bg: string; border: string; text: string }> = {
  general:        { bg: "#f0f4f8", border: "#cbd5e1", text: "#334155" },
  sitework:       { bg: "#fef3c7", border: "#f59e0b", text: "#78350f" },
  concrete:       { bg: "#e0e7ff", border: "#6366f1", text: "#312e81" },
  masonry:        { bg: "#fce7f3", border: "#ec4899", text: "#831843" },
  metals:         { bg: "#d1fae5", border: "#10b981", text: "#064e3b" },
  wood:           { bg: "#ffedd5", border: "#f97316", text: "#7c2d12" },
  thermal:        { bg: "#dbeafe", border: "#3b82f6", text: "#1e3a5f" },
  openings:       { bg: "#ede9fe", border: "#8b5cf6", text: "#4c1d95" },
  finishes:       { bg: "#fef9c3", border: "#eab308", text: "#713f12" },
  specialties:    { bg: "#f0fdf4", border: "#22c55e", text: "#14532d" },
  mechanical:     { bg: "#ecfeff", border: "#06b6d4", text: "#164e63" },
  electrical:     { bg: "#fff7ed", border: "#ea580c", text: "#7c2d12" },
  infrastructure: { bg: "#f5f3ff", border: "#7c3aed", text: "#3b0764" },
  process:        { bg: "#fdf2f8", border: "#d946ef", text: "#701a75" },
  reserved:       { bg: "#f1f5f9", border: "#94a3b8", text: "#475569" },
};

/**
 * Get a distinct color for a WBS code based on its CSI division prefix.
 * Falls back to a hash-based color for custom (non-CSI) WBS codes.
 */
export function getWbsColor(wbsCode: string): { bg: string; border: string; text: string } {
  // Try to match CSI division prefix (first 2 digits)
  const prefix = wbsCode.replace(/\D/g, "").slice(0, 2).padStart(2, "0");
  const division = CSI_DIVISIONS.find(d => d.code === prefix);
  if (division) {
    return WBS_GROUP_COLORS[division.group];
  }

  // Hash-based fallback for custom WBS codes
  const FALLBACK_COLORS = [
    { bg: "#fef2f2", border: "#ef4444", text: "#7f1d1d" },
    { bg: "#fffbeb", border: "#f59e0b", text: "#78350f" },
    { bg: "#f0fdf4", border: "#22c55e", text: "#14532d" },
    { bg: "#eff6ff", border: "#3b82f6", text: "#1e3a5f" },
    { bg: "#faf5ff", border: "#a855f7", text: "#581c87" },
    { bg: "#fff1f2", border: "#f43f5e", text: "#881337" },
    { bg: "#f0fdfa", border: "#14b8a6", text: "#134e4a" },
    { bg: "#fefce8", border: "#84cc16", text: "#365314" },
  ];
  let hash = 0;
  for (let i = 0; i < wbsCode.length; i++) {
    hash = ((hash << 5) - hash + wbsCode.charCodeAt(i)) | 0;
  }
  return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length];
}

// ─── Takeoff-Specific Division Helpers ──────────────────────────────────────

/**
 * Divisions commonly used in quantity takeoffs (excludes reserved, process, etc.)
 * These are the divisions shown in the takeoff division selector UI.
 */
export const TAKEOFF_DIVISIONS = CSI_DIVISIONS.filter(
  (d) => d.group !== "reserved" && d.group !== "process" && d.code !== "00"
);

/** Quick lookup map: code → division name (for takeoff display) */
export const TAKEOFF_DIVISION_MAP: Record<string, string> = Object.fromEntries(
  TAKEOFF_DIVISIONS.map((d) => [d.code, d.name])
);

/** All valid takeoff division codes */
export const ALL_TAKEOFF_DIVISION_CODES = TAKEOFF_DIVISIONS.map((d) => d.code);

/**
 * Pre-built division presets for common sub-contractor scopes.
 * These are convenience shortcuts in the division selector UI.
 */
export const DIVISION_PRESETS: { label: string; description: string; codes: string[] }[] = [
  { label: "All Divisions", description: "Full GC takeoff — every CSI division", codes: ALL_TAKEOFF_DIVISION_CODES },
  { label: "Concrete Sub", description: "Division 03 only", codes: ["03"] },
  { label: "Masonry Sub", description: "Division 04 only", codes: ["04"] },
  { label: "Steel / Metals", description: "Division 05 only", codes: ["05"] },
  { label: "Framing & Carpentry", description: "Division 06 only", codes: ["06"] },
  { label: "Roofing", description: "Division 07 only", codes: ["07"] },
  { label: "Doors & Windows", description: "Division 08 only", codes: ["08"] },
  { label: "Drywall & Finishes", description: "Division 09 only", codes: ["09"] },
  { label: "Plumbing", description: "Division 22 only", codes: ["22"] },
  { label: "HVAC", description: "Division 23 only", codes: ["23"] },
  { label: "Electrical", description: "Division 26 only", codes: ["26"] },
  { label: "Fire Protection", description: "Division 21 only", codes: ["21"] },
  { label: "Sitework Package", description: "Existing Conditions + Earthwork + Exterior + Utilities", codes: ["02", "31", "32", "33"] },
  { label: "MEP Package", description: "Fire, Plumbing, HVAC, Electrical, Comms, Security", codes: ["21", "22", "23", "26", "27", "28"] },
  { label: "Building Envelope", description: "Masonry + Metals + Roofing + Openings", codes: ["04", "05", "07", "08"] },
  { label: "Interior Finishes", description: "Finishes + Specialties + Furnishings", codes: ["09", "10", "12"] },
];
