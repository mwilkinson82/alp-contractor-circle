/**
 * CPM Schedule Templates — Professional construction schedule templates
 * with full WBS hierarchies, activities, logic ties, and activity codes.
 *
 * Each template follows P6/CPM best practices:
 * - Hierarchical WBS structure
 * - Realistic durations based on industry standards
 * - Proper FS/SS/FF logic ties with appropriate lags
 * - Activity codes for Phase and Trade categorization
 */

export type ScheduleTemplate = {
  name: string;
  description: string;
  activities: Array<{
    activityId: string;
    name: string;
    duration: number;
    wbs: string;
    activityType?: "task" | "milestone";
  }>;
  relationships: Array<{
    pred: string;
    succ: string;
    type: "FS" | "SS" | "FF" | "SF";
    lag: number;
  }>;
  wbsNodes?: Array<{
    code: string;
    name: string;
    parentCode: string | null;
    sortOrder: number;
    color: string;
    textColor: string;
  }>;
  codeCategories?: Array<{
    name: string;
    values: string[];
  }>;
};

// ═══════════════════════════════════════════════════════════════════════════════
// HOSPITAL CONSTRUCTION — Full-service acute care facility
// ~24-month schedule, 80+ activities across all CSI divisions
// ═══════════════════════════════════════════════════════════════════════════════

export const hospitalTemplate: ScheduleTemplate = {
  name: "Hospital / Healthcare Facility",
  description: "Full-service acute care hospital — sitework through commissioning with MEP-heavy sequencing, infection control, and phased occupancy",
  activities: [
    // ── 1. Pre-Construction & Mobilization ──
    { activityId: "H1010", name: "Notice to Proceed", duration: 0, wbs: "1.0", activityType: "milestone" },
    { activityId: "H1020", name: "Mobilization & Site Setup", duration: 10, wbs: "1.0" },
    { activityId: "H1030", name: "Survey & Layout", duration: 5, wbs: "1.0" },
    { activityId: "H1040", name: "Erosion Control & SWPPP", duration: 3, wbs: "1.0" },
    // ── 2. Submittals & Procurement ──
    { activityId: "H2010", name: "Submit Structural Steel Shop Drawings", duration: 14, wbs: "2.1" },
    { activityId: "H2020", name: "Structural Steel Review & Approval", duration: 21, wbs: "2.2" },
    { activityId: "H2030", name: "Submit MEP Coordination Drawings", duration: 14, wbs: "2.1" },
    { activityId: "H2040", name: "MEP Coordination Review", duration: 21, wbs: "2.2" },
    { activityId: "H2050", name: "Submit Curtain Wall Shop Drawings", duration: 14, wbs: "2.1" },
    { activityId: "H2060", name: "Curtain Wall Review & Approval", duration: 21, wbs: "2.2" },
    { activityId: "H2070", name: "Procure Medical Gas Equipment", duration: 5, wbs: "2.3" },
    { activityId: "H2080", name: "Medical Gas Equipment Lead Time", duration: 60, wbs: "2.3" },
    { activityId: "H2090", name: "Procure Elevator Equipment", duration: 5, wbs: "2.3" },
    { activityId: "H2100", name: "Elevator Equipment Lead Time", duration: 90, wbs: "2.3" },
    { activityId: "H2110", name: "Procure Generator & Switchgear", duration: 5, wbs: "2.3" },
    { activityId: "H2120", name: "Generator & Switchgear Lead Time", duration: 75, wbs: "2.3" },
    // ── 3. Sitework & Utilities ──
    { activityId: "H3010", name: "Mass Excavation", duration: 15, wbs: "3.1" },
    { activityId: "H3020", name: "Underground Utilities — Storm", duration: 12, wbs: "3.1" },
    { activityId: "H3030", name: "Underground Utilities — Sanitary", duration: 10, wbs: "3.1" },
    { activityId: "H3040", name: "Underground Utilities — Water Main", duration: 8, wbs: "3.1" },
    { activityId: "H3050", name: "Underground Electrical Ductbank", duration: 10, wbs: "3.1" },
    { activityId: "H3060", name: "Backfill & Compaction", duration: 8, wbs: "3.1" },
    // ── 4. Foundations & Structure ──
    { activityId: "H4010", name: "Pile Driving / Deep Foundations", duration: 20, wbs: "4.1" },
    { activityId: "H4020", name: "Foundation Walls & Grade Beams", duration: 15, wbs: "4.1" },
    { activityId: "H4030", name: "Slab on Grade — Level 1", duration: 10, wbs: "4.1" },
    { activityId: "H4040", name: "Structural Steel Erection — Level 1", duration: 15, wbs: "4.2" },
    { activityId: "H4050", name: "Metal Deck & Shear Studs — Level 1", duration: 8, wbs: "4.2" },
    { activityId: "H4060", name: "Structural Steel Erection — Level 2", duration: 15, wbs: "4.2" },
    { activityId: "H4070", name: "Metal Deck & Shear Studs — Level 2", duration: 8, wbs: "4.2" },
    { activityId: "H4080", name: "Structural Steel Erection — Level 3", duration: 15, wbs: "4.2" },
    { activityId: "H4090", name: "Metal Deck & Shear Studs — Level 3", duration: 8, wbs: "4.2" },
    { activityId: "H4100", name: "Concrete Topping — Level 2", duration: 10, wbs: "4.3" },
    { activityId: "H4110", name: "Concrete Topping — Level 3", duration: 10, wbs: "4.3" },
    { activityId: "H4120", name: "Roof Steel & Penthouse", duration: 12, wbs: "4.2" },
    // ── 5. Building Enclosure ──
    { activityId: "H5010", name: "Curtain Wall Installation — Level 1-2", duration: 20, wbs: "5.0" },
    { activityId: "H5020", name: "Curtain Wall Installation — Level 3 & Penthouse", duration: 15, wbs: "5.0" },
    { activityId: "H5030", name: "Roofing & Waterproofing", duration: 15, wbs: "5.0" },
    { activityId: "H5040", name: "Masonry Veneer & Flashings", duration: 20, wbs: "5.0" },
    // ── 6. MEP Rough-In ──
    { activityId: "H6010", name: "Electrical Rough-In — Level 1", duration: 15, wbs: "6.1" },
    { activityId: "H6020", name: "Electrical Rough-In — Level 2", duration: 15, wbs: "6.1" },
    { activityId: "H6030", name: "Electrical Rough-In — Level 3", duration: 15, wbs: "6.1" },
    { activityId: "H6040", name: "Plumbing Rough-In — Level 1", duration: 12, wbs: "6.2" },
    { activityId: "H6050", name: "Plumbing Rough-In — Level 2", duration: 12, wbs: "6.2" },
    { activityId: "H6060", name: "Plumbing Rough-In — Level 3", duration: 12, wbs: "6.2" },
    { activityId: "H6070", name: "HVAC Ductwork — Level 1", duration: 18, wbs: "6.3" },
    { activityId: "H6080", name: "HVAC Ductwork — Level 2", duration: 18, wbs: "6.3" },
    { activityId: "H6090", name: "HVAC Ductwork — Level 3", duration: 18, wbs: "6.3" },
    { activityId: "H6100", name: "Fire Sprinkler Rough-In — Level 1", duration: 10, wbs: "6.4" },
    { activityId: "H6110", name: "Fire Sprinkler Rough-In — Level 2", duration: 10, wbs: "6.4" },
    { activityId: "H6120", name: "Fire Sprinkler Rough-In — Level 3", duration: 10, wbs: "6.4" },
    { activityId: "H6130", name: "Medical Gas Piping — All Levels", duration: 25, wbs: "6.5" },
    { activityId: "H6140", name: "Fire Alarm Rough-In", duration: 15, wbs: "6.4" },
    // ── 7. Interior Build-Out ──
    { activityId: "H7010", name: "Metal Stud Framing — Level 1", duration: 12, wbs: "7.1" },
    { activityId: "H7020", name: "Metal Stud Framing — Level 2", duration: 12, wbs: "7.1" },
    { activityId: "H7030", name: "Metal Stud Framing — Level 3", duration: 12, wbs: "7.1" },
    { activityId: "H7040", name: "Drywall & Taping — Level 1", duration: 15, wbs: "7.2" },
    { activityId: "H7050", name: "Drywall & Taping — Level 2", duration: 15, wbs: "7.2" },
    { activityId: "H7060", name: "Drywall & Taping — Level 3", duration: 15, wbs: "7.2" },
    { activityId: "H7070", name: "Ceramic Tile — Level 1", duration: 10, wbs: "7.3" },
    { activityId: "H7080", name: "Ceramic Tile — Level 2", duration: 10, wbs: "7.3" },
    { activityId: "H7090", name: "ACT Ceiling Grid — All Levels", duration: 15, wbs: "7.3" },
    { activityId: "H7100", name: "Paint — All Levels", duration: 20, wbs: "7.3" },
    { activityId: "H7110", name: "Flooring (VCT/Sheet Vinyl/Carpet) — All Levels", duration: 18, wbs: "7.3" },
    { activityId: "H7120", name: "Casework & Millwork — All Levels", duration: 15, wbs: "7.3" },
    // ── 8. MEP Trim & Equipment ──
    { activityId: "H8010", name: "Electrical Trim-Out — All Levels", duration: 15, wbs: "8.0" },
    { activityId: "H8020", name: "Plumbing Trim-Out — All Levels", duration: 12, wbs: "8.0" },
    { activityId: "H8030", name: "HVAC Trim & Controls", duration: 12, wbs: "8.0" },
    { activityId: "H8040", name: "Fire Alarm Devices & Testing", duration: 10, wbs: "8.0" },
    { activityId: "H8050", name: "Elevator Installation & Testing", duration: 30, wbs: "8.0" },
    { activityId: "H8060", name: "Generator Installation & Testing", duration: 15, wbs: "8.0" },
    { activityId: "H8070", name: "Medical Gas Certification", duration: 10, wbs: "8.0" },
    // ── 9. Commissioning & Closeout ──
    { activityId: "H9010", name: "HVAC TAB (Test, Adjust, Balance)", duration: 20, wbs: "9.0" },
    { activityId: "H9020", name: "Building Automation System Programming", duration: 15, wbs: "9.0" },
    { activityId: "H9030", name: "Commissioning — MEP Systems", duration: 20, wbs: "9.0" },
    { activityId: "H9040", name: "Life Safety Systems Testing", duration: 10, wbs: "9.0" },
    { activityId: "H9050", name: "Final Cleaning", duration: 10, wbs: "9.0" },
    { activityId: "H9060", name: "Punch List", duration: 15, wbs: "9.0" },
    { activityId: "H9070", name: "State Health Dept Inspection", duration: 5, wbs: "9.0" },
    { activityId: "H9080", name: "Certificate of Occupancy", duration: 0, wbs: "9.0", activityType: "milestone" },
    // ── 10. Site Finishes ──
    { activityId: "H10010", name: "Paving & Striping", duration: 12, wbs: "10.0" },
    { activityId: "H10020", name: "Landscaping & Irrigation", duration: 15, wbs: "10.0" },
    { activityId: "H10030", name: "Site Lighting & Signage", duration: 8, wbs: "10.0" },
  ],
  relationships: [
    // Pre-con flow
    { pred: "H1010", succ: "H1020", type: "FS", lag: 0 },
    { pred: "H1020", succ: "H1030", type: "FS", lag: 0 },
    { pred: "H1030", succ: "H1040", type: "FS", lag: 0 },
    // Submittals start after mobilization
    { pred: "H1020", succ: "H2010", type: "FS", lag: 0 },
    { pred: "H2010", succ: "H2020", type: "FS", lag: 0 },
    { pred: "H1020", succ: "H2030", type: "FS", lag: 0 },
    { pred: "H2030", succ: "H2040", type: "FS", lag: 0 },
    { pred: "H1020", succ: "H2050", type: "FS", lag: 0 },
    { pred: "H2050", succ: "H2060", type: "FS", lag: 0 },
    { pred: "H1020", succ: "H2070", type: "FS", lag: 0 },
    { pred: "H2070", succ: "H2080", type: "FS", lag: 0 },
    { pred: "H1020", succ: "H2090", type: "FS", lag: 0 },
    { pred: "H2090", succ: "H2100", type: "FS", lag: 0 },
    { pred: "H1020", succ: "H2110", type: "FS", lag: 0 },
    { pred: "H2110", succ: "H2120", type: "FS", lag: 0 },
    // Sitework
    { pred: "H1040", succ: "H3010", type: "FS", lag: 0 },
    { pred: "H3010", succ: "H3020", type: "FS", lag: 0 },
    { pred: "H3010", succ: "H3030", type: "SS", lag: 5 },
    { pred: "H3010", succ: "H3040", type: "SS", lag: 5 },
    { pred: "H3010", succ: "H3050", type: "SS", lag: 8 },
    { pred: "H3020", succ: "H3060", type: "FS", lag: 0 },
    { pred: "H3030", succ: "H3060", type: "FS", lag: 0 },
    { pred: "H3040", succ: "H3060", type: "FS", lag: 0 },
    { pred: "H3050", succ: "H3060", type: "FS", lag: 0 },
    // Foundations
    { pred: "H3060", succ: "H4010", type: "FS", lag: 0 },
    { pred: "H4010", succ: "H4020", type: "FS", lag: 0 },
    { pred: "H4020", succ: "H4030", type: "FS", lag: 0 },
    // Steel erection (requires approved shop drawings)
    { pred: "H4030", succ: "H4040", type: "FS", lag: 0 },
    { pred: "H2020", succ: "H4040", type: "FS", lag: 0 },
    { pred: "H4040", succ: "H4050", type: "SS", lag: 5 },
    { pred: "H4050", succ: "H4060", type: "FS", lag: 0 },
    { pred: "H4060", succ: "H4070", type: "SS", lag: 5 },
    { pred: "H4070", succ: "H4080", type: "FS", lag: 0 },
    { pred: "H4080", succ: "H4090", type: "SS", lag: 5 },
    { pred: "H4050", succ: "H4100", type: "FS", lag: 3 },
    { pred: "H4070", succ: "H4110", type: "FS", lag: 3 },
    { pred: "H4090", succ: "H4120", type: "FS", lag: 0 },
    // Enclosure (requires approved curtain wall drawings)
    { pred: "H4100", succ: "H5010", type: "FS", lag: 0 },
    { pred: "H2060", succ: "H5010", type: "FS", lag: 0 },
    { pred: "H4110", succ: "H5020", type: "FS", lag: 0 },
    { pred: "H5010", succ: "H5020", type: "SS", lag: 10 },
    { pred: "H4120", succ: "H5030", type: "FS", lag: 0 },
    { pred: "H5010", succ: "H5040", type: "SS", lag: 5 },
    // MEP Rough-In (follows framing per level, requires MEP coord approval)
    { pred: "H5010", succ: "H7010", type: "SS", lag: 10 },
    { pred: "H2040", succ: "H6010", type: "FS", lag: 0 },
    { pred: "H7010", succ: "H6010", type: "SS", lag: 3 },
    { pred: "H7010", succ: "H6040", type: "SS", lag: 3 },
    { pred: "H7010", succ: "H6070", type: "SS", lag: 5 },
    { pred: "H7010", succ: "H6100", type: "SS", lag: 5 },
    { pred: "H5020", succ: "H7020", type: "SS", lag: 10 },
    { pred: "H7020", succ: "H6020", type: "SS", lag: 3 },
    { pred: "H7020", succ: "H6050", type: "SS", lag: 3 },
    { pred: "H7020", succ: "H6080", type: "SS", lag: 5 },
    { pred: "H7020", succ: "H6110", type: "SS", lag: 5 },
    { pred: "H5020", succ: "H7030", type: "SS", lag: 15 },
    { pred: "H7030", succ: "H6030", type: "SS", lag: 3 },
    { pred: "H7030", succ: "H6060", type: "SS", lag: 3 },
    { pred: "H7030", succ: "H6090", type: "SS", lag: 5 },
    { pred: "H7030", succ: "H6120", type: "SS", lag: 5 },
    // Medical gas follows plumbing rough-in
    { pred: "H6040", succ: "H6130", type: "SS", lag: 5 },
    { pred: "H6050", succ: "H6130", type: "SS", lag: 5 },
    // Fire alarm follows electrical rough-in
    { pred: "H6010", succ: "H6140", type: "SS", lag: 5 },
    // Drywall follows MEP rough-in
    { pred: "H6010", succ: "H7040", type: "FS", lag: 0 },
    { pred: "H6040", succ: "H7040", type: "FS", lag: 0 },
    { pred: "H6070", succ: "H7040", type: "FS", lag: 0 },
    { pred: "H6100", succ: "H7040", type: "FS", lag: 0 },
    { pred: "H6020", succ: "H7050", type: "FS", lag: 0 },
    { pred: "H6050", succ: "H7050", type: "FS", lag: 0 },
    { pred: "H6080", succ: "H7050", type: "FS", lag: 0 },
    { pred: "H6110", succ: "H7050", type: "FS", lag: 0 },
    { pred: "H6030", succ: "H7060", type: "FS", lag: 0 },
    { pred: "H6060", succ: "H7060", type: "FS", lag: 0 },
    { pred: "H6090", succ: "H7060", type: "FS", lag: 0 },
    { pred: "H6120", succ: "H7060", type: "FS", lag: 0 },
    // Finishes follow drywall
    { pred: "H7040", succ: "H7070", type: "FS", lag: 0 },
    { pred: "H7050", succ: "H7080", type: "FS", lag: 0 },
    { pred: "H7040", succ: "H7090", type: "SS", lag: 5 },
    { pred: "H7050", succ: "H7090", type: "SS", lag: 5 },
    { pred: "H7060", succ: "H7090", type: "SS", lag: 5 },
    { pred: "H7040", succ: "H7100", type: "FS", lag: 0 },
    { pred: "H7050", succ: "H7100", type: "SS", lag: 5 },
    { pred: "H7060", succ: "H7100", type: "SS", lag: 10 },
    { pred: "H7100", succ: "H7110", type: "FS", lag: 0 },
    { pred: "H7070", succ: "H7110", type: "FS", lag: 0 },
    { pred: "H7080", succ: "H7110", type: "FS", lag: 0 },
    { pred: "H7100", succ: "H7120", type: "SS", lag: 5 },
    // MEP Trim follows finishes
    { pred: "H7110", succ: "H8010", type: "SS", lag: 5 },
    { pred: "H7110", succ: "H8020", type: "SS", lag: 5 },
    { pred: "H7110", succ: "H8030", type: "SS", lag: 5 },
    { pred: "H6140", succ: "H8040", type: "FS", lag: 0 },
    { pred: "H7090", succ: "H8040", type: "FS", lag: 0 },
    // Elevator requires equipment delivery
    { pred: "H2100", succ: "H8050", type: "FS", lag: 0 },
    { pred: "H4100", succ: "H8050", type: "FS", lag: 0 },
    // Generator requires equipment delivery
    { pred: "H2120", succ: "H8060", type: "FS", lag: 0 },
    { pred: "H3050", succ: "H8060", type: "FS", lag: 0 },
    // Medical gas cert requires piping complete
    { pred: "H6130", succ: "H8070", type: "FS", lag: 0 },
    { pred: "H2080", succ: "H8070", type: "FS", lag: 0 },
    // Commissioning
    { pred: "H8030", succ: "H9010", type: "FS", lag: 0 },
    { pred: "H9010", succ: "H9020", type: "SS", lag: 5 },
    { pred: "H8010", succ: "H9030", type: "FS", lag: 0 },
    { pred: "H8020", succ: "H9030", type: "FS", lag: 0 },
    { pred: "H9010", succ: "H9030", type: "FS", lag: 0 },
    { pred: "H8040", succ: "H9040", type: "FS", lag: 0 },
    { pred: "H8050", succ: "H9040", type: "FS", lag: 0 },
    { pred: "H9030", succ: "H9050", type: "FS", lag: 0 },
    { pred: "H9040", succ: "H9050", type: "FS", lag: 0 },
    { pred: "H9050", succ: "H9060", type: "FS", lag: 0 },
    { pred: "H9060", succ: "H9070", type: "FS", lag: 0 },
    { pred: "H9070", succ: "H9080", type: "FS", lag: 0 },
    // Site finishes (concurrent with interior closeout)
    { pred: "H5040", succ: "H10010", type: "FS", lag: 0 },
    { pred: "H10010", succ: "H10020", type: "SS", lag: 5 },
    { pred: "H10010", succ: "H10030", type: "SS", lag: 3 },
    { pred: "H10020", succ: "H9050", type: "FS", lag: 0 },
  ],
  wbsNodes: [
    { code: "1.0", name: "Pre-Construction & Mobilization", parentCode: null, sortOrder: 10, color: "#f59e0b", textColor: "#ffffff" },
    { code: "2.0", name: "Submittals & Procurement", parentCode: null, sortOrder: 20, color: "#f97316", textColor: "#ffffff" },
    { code: "2.1", name: "Prepare & Submit", parentCode: "2.0", sortOrder: 21, color: "#fb923c", textColor: "#000000" },
    { code: "2.2", name: "Review & Approve", parentCode: "2.0", sortOrder: 22, color: "#fdba74", textColor: "#000000" },
    { code: "2.3", name: "Procurement & Lead Times", parentCode: "2.0", sortOrder: 23, color: "#fed7aa", textColor: "#000000" },
    { code: "3.0", name: "Sitework & Utilities", parentCode: null, sortOrder: 30, color: "#84cc16", textColor: "#ffffff" },
    { code: "3.1", name: "Earthwork & Underground", parentCode: "3.0", sortOrder: 31, color: "#a3e635", textColor: "#000000" },
    { code: "4.0", name: "Foundations & Structure", parentCode: null, sortOrder: 40, color: "#6366f1", textColor: "#ffffff" },
    { code: "4.1", name: "Foundations", parentCode: "4.0", sortOrder: 41, color: "#818cf8", textColor: "#000000" },
    { code: "4.2", name: "Structural Steel", parentCode: "4.0", sortOrder: 42, color: "#a5b4fc", textColor: "#000000" },
    { code: "4.3", name: "Concrete Topping", parentCode: "4.0", sortOrder: 43, color: "#c7d2fe", textColor: "#000000" },
    { code: "5.0", name: "Building Enclosure", parentCode: null, sortOrder: 50, color: "#ec4899", textColor: "#ffffff" },
    { code: "6.0", name: "MEP Rough-In", parentCode: null, sortOrder: 60, color: "#3b82f6", textColor: "#ffffff" },
    { code: "6.1", name: "Electrical", parentCode: "6.0", sortOrder: 61, color: "#60a5fa", textColor: "#000000" },
    { code: "6.2", name: "Plumbing", parentCode: "6.0", sortOrder: 62, color: "#93c5fd", textColor: "#000000" },
    { code: "6.3", name: "HVAC", parentCode: "6.0", sortOrder: 63, color: "#bfdbfe", textColor: "#000000" },
    { code: "6.4", name: "Fire Protection", parentCode: "6.0", sortOrder: 64, color: "#dbeafe", textColor: "#000000" },
    { code: "6.5", name: "Medical Gas", parentCode: "6.0", sortOrder: 65, color: "#06b6d4", textColor: "#ffffff" },
    { code: "7.0", name: "Interior Build-Out", parentCode: null, sortOrder: 70, color: "#8b5cf6", textColor: "#ffffff" },
    { code: "7.1", name: "Framing", parentCode: "7.0", sortOrder: 71, color: "#a78bfa", textColor: "#000000" },
    { code: "7.2", name: "Drywall", parentCode: "7.0", sortOrder: 72, color: "#c4b5fd", textColor: "#000000" },
    { code: "7.3", name: "Finishes", parentCode: "7.0", sortOrder: 73, color: "#ddd6fe", textColor: "#000000" },
    { code: "8.0", name: "MEP Trim & Equipment", parentCode: null, sortOrder: 80, color: "#14b8a6", textColor: "#ffffff" },
    { code: "9.0", name: "Commissioning & Closeout", parentCode: null, sortOrder: 90, color: "#ef4444", textColor: "#ffffff" },
    { code: "10.0", name: "Site Finishes", parentCode: null, sortOrder: 100, color: "#10b981", textColor: "#ffffff" },
  ],
  codeCategories: [
    { name: "Phase", values: ["Pre-Con", "Submittals", "Procurement", "Sitework", "Foundation", "Structure", "Enclosure", "MEP Rough-In", "Interior", "MEP Trim", "Commissioning", "Closeout", "Site Finishes"] },
    { name: "Trade", values: ["General", "Civil", "Concrete", "Structural Steel", "Curtain Wall", "Roofing", "Masonry", "Electrical", "Plumbing", "HVAC", "Fire Protection", "Medical Gas", "Elevator", "Drywall", "Paint", "Flooring", "Tile", "Casework"] },
    { name: "Level", values: ["Site", "Level 1", "Level 2", "Level 3", "Penthouse", "All Levels"] },
  ],
};


// ═══════════════════════════════════════════════════════════════════════════════
// WATER TREATMENT PLANT — Municipal water/wastewater treatment facility
// Heavy civil, process piping, and equipment-intensive
// ═══════════════════════════════════════════════════════════════════════════════

export const waterTreatmentTemplate: ScheduleTemplate = {
  name: "Water Treatment Plant",
  description: "Municipal water/wastewater treatment facility — heavy civil, process piping, equipment installation, and commissioning",
  activities: [
    // ── 1. Pre-Construction ──
    { activityId: "W1010", name: "Notice to Proceed", duration: 0, wbs: "1.0", activityType: "milestone" },
    { activityId: "W1020", name: "Mobilization & Site Setup", duration: 10, wbs: "1.0" },
    { activityId: "W1030", name: "Survey & Layout", duration: 5, wbs: "1.0" },
    { activityId: "W1040", name: "Erosion & Sediment Control", duration: 3, wbs: "1.0" },
    { activityId: "W1050", name: "Temporary Bypass Pumping Setup", duration: 10, wbs: "1.0" },
    // ── 2. Submittals & Procurement ──
    { activityId: "W2010", name: "Submit Process Equipment Shop Drawings", duration: 14, wbs: "2.1" },
    { activityId: "W2020", name: "Process Equipment Review & Approval", duration: 21, wbs: "2.2" },
    { activityId: "W2030", name: "Procure Clarifier Mechanisms", duration: 5, wbs: "2.3" },
    { activityId: "W2040", name: "Clarifier Lead Time", duration: 120, wbs: "2.3" },
    { activityId: "W2050", name: "Procure Filter Equipment", duration: 5, wbs: "2.3" },
    { activityId: "W2060", name: "Filter Equipment Lead Time", duration: 90, wbs: "2.3" },
    { activityId: "W2070", name: "Procure Pumps & Blowers", duration: 5, wbs: "2.3" },
    { activityId: "W2080", name: "Pumps & Blowers Lead Time", duration: 60, wbs: "2.3" },
    { activityId: "W2090", name: "Procure Chemical Feed Systems", duration: 5, wbs: "2.3" },
    { activityId: "W2100", name: "Chemical Feed Lead Time", duration: 45, wbs: "2.3" },
    // ── 3. Sitework & Earthwork ──
    { activityId: "W3010", name: "Clear & Grub", duration: 8, wbs: "3.0" },
    { activityId: "W3020", name: "Mass Excavation — Basin Area", duration: 20, wbs: "3.0" },
    { activityId: "W3030", name: "Dewatering System Installation", duration: 10, wbs: "3.0" },
    { activityId: "W3040", name: "Subgrade Preparation", duration: 8, wbs: "3.0" },
    { activityId: "W3050", name: "Underground Process Piping", duration: 25, wbs: "3.0" },
    { activityId: "W3060", name: "Underground Electrical Ductbank", duration: 15, wbs: "3.0" },
    // ── 4. Concrete Structures ──
    { activityId: "W4010", name: "Headworks — Foundation & Walls", duration: 20, wbs: "4.1" },
    { activityId: "W4020", name: "Headworks — Elevated Slab & Equipment Pads", duration: 10, wbs: "4.1" },
    { activityId: "W4030", name: "Clarifier Basin #1 — Foundation", duration: 15, wbs: "4.2" },
    { activityId: "W4040", name: "Clarifier Basin #1 — Walls", duration: 20, wbs: "4.2" },
    { activityId: "W4050", name: "Clarifier Basin #2 — Foundation", duration: 15, wbs: "4.2" },
    { activityId: "W4060", name: "Clarifier Basin #2 — Walls", duration: 20, wbs: "4.2" },
    { activityId: "W4070", name: "Filter Building — Foundation", duration: 12, wbs: "4.3" },
    { activityId: "W4080", name: "Filter Building — Walls & Columns", duration: 18, wbs: "4.3" },
    { activityId: "W4090", name: "Filter Building — Roof Slab", duration: 10, wbs: "4.3" },
    { activityId: "W4100", name: "Chemical Building — Foundation & Walls", duration: 15, wbs: "4.4" },
    { activityId: "W4110", name: "Chemical Building — Roof", duration: 8, wbs: "4.4" },
    { activityId: "W4120", name: "Pump Station — Foundation & Walls", duration: 12, wbs: "4.5" },
    { activityId: "W4130", name: "Pump Station — Elevated Slab", duration: 8, wbs: "4.5" },
    { activityId: "W4140", name: "Operations Building — Foundation", duration: 10, wbs: "4.6" },
    { activityId: "W4150", name: "Operations Building — Structure & Roof", duration: 20, wbs: "4.6" },
    // ── 5. Process Equipment Installation ──
    { activityId: "W5010", name: "Headworks Screen & Grit Equipment", duration: 12, wbs: "5.0" },
    { activityId: "W5020", name: "Clarifier #1 Mechanism Install", duration: 15, wbs: "5.0" },
    { activityId: "W5030", name: "Clarifier #2 Mechanism Install", duration: 15, wbs: "5.0" },
    { activityId: "W5040", name: "Filter Media & Underdrain Install", duration: 18, wbs: "5.0" },
    { activityId: "W5050", name: "Pump Installation — All Stations", duration: 15, wbs: "5.0" },
    { activityId: "W5060", name: "Chemical Feed System Install", duration: 12, wbs: "5.0" },
    { activityId: "W5070", name: "UV Disinfection System Install", duration: 10, wbs: "5.0" },
    // ── 6. Process Piping ──
    { activityId: "W6010", name: "Above-Grade Process Piping — Headworks", duration: 15, wbs: "6.0" },
    { activityId: "W6020", name: "Above-Grade Process Piping — Clarifiers", duration: 20, wbs: "6.0" },
    { activityId: "W6030", name: "Above-Grade Process Piping — Filters", duration: 18, wbs: "6.0" },
    { activityId: "W6040", name: "Chemical Piping & Containment", duration: 12, wbs: "6.0" },
    { activityId: "W6050", name: "Valve & Actuator Installation", duration: 10, wbs: "6.0" },
    // ── 7. Electrical & I&C ──
    { activityId: "W7010", name: "Main Switchgear & MCC Installation", duration: 15, wbs: "7.0" },
    { activityId: "W7020", name: "Power Distribution & Conduit", duration: 20, wbs: "7.0" },
    { activityId: "W7030", name: "Motor Connections & VFDs", duration: 12, wbs: "7.0" },
    { activityId: "W7040", name: "Instrumentation Installation", duration: 15, wbs: "7.0" },
    { activityId: "W7050", name: "SCADA System Installation", duration: 12, wbs: "7.0" },
    { activityId: "W7060", name: "Standby Generator Installation", duration: 10, wbs: "7.0" },
    // ── 8. Operations Building Fit-Out ──
    { activityId: "W8010", name: "Ops Building — MEP Rough-In", duration: 12, wbs: "8.0" },
    { activityId: "W8020", name: "Ops Building — Interior Finishes", duration: 15, wbs: "8.0" },
    { activityId: "W8030", name: "Ops Building — Lab Equipment", duration: 8, wbs: "8.0" },
    { activityId: "W8040", name: "Ops Building — SCADA Control Room", duration: 10, wbs: "8.0" },
    // ── 9. Testing & Commissioning ──
    { activityId: "W9010", name: "Hydrostatic Testing — All Basins", duration: 15, wbs: "9.0" },
    { activityId: "W9020", name: "Process Equipment Startup", duration: 20, wbs: "9.0" },
    { activityId: "W9030", name: "Electrical System Testing", duration: 10, wbs: "9.0" },
    { activityId: "W9040", name: "SCADA Integration & Testing", duration: 15, wbs: "9.0" },
    { activityId: "W9050", name: "Process Performance Testing", duration: 30, wbs: "9.0" },
    { activityId: "W9060", name: "Operator Training", duration: 10, wbs: "9.0" },
    { activityId: "W9070", name: "Punch List", duration: 15, wbs: "9.0" },
    { activityId: "W9080", name: "Substantial Completion", duration: 0, wbs: "9.0", activityType: "milestone" },
    // ── 10. Site Restoration ──
    { activityId: "W10010", name: "Paving & Access Roads", duration: 12, wbs: "10.0" },
    { activityId: "W10020", name: "Fencing & Security", duration: 8, wbs: "10.0" },
    { activityId: "W10030", name: "Landscaping & Restoration", duration: 10, wbs: "10.0" },
  ],
  relationships: [
    // Pre-con
    { pred: "W1010", succ: "W1020", type: "FS", lag: 0 },
    { pred: "W1020", succ: "W1030", type: "FS", lag: 0 },
    { pred: "W1030", succ: "W1040", type: "FS", lag: 0 },
    { pred: "W1020", succ: "W1050", type: "SS", lag: 3 },
    // Submittals
    { pred: "W1020", succ: "W2010", type: "FS", lag: 0 },
    { pred: "W2010", succ: "W2020", type: "FS", lag: 0 },
    { pred: "W2020", succ: "W2030", type: "FS", lag: 0 },
    { pred: "W2030", succ: "W2040", type: "FS", lag: 0 },
    { pred: "W2020", succ: "W2050", type: "FS", lag: 0 },
    { pred: "W2050", succ: "W2060", type: "FS", lag: 0 },
    { pred: "W2020", succ: "W2070", type: "FS", lag: 0 },
    { pred: "W2070", succ: "W2080", type: "FS", lag: 0 },
    { pred: "W2020", succ: "W2090", type: "FS", lag: 0 },
    { pred: "W2090", succ: "W2100", type: "FS", lag: 0 },
    // Sitework
    { pred: "W1040", succ: "W3010", type: "FS", lag: 0 },
    { pred: "W3010", succ: "W3020", type: "FS", lag: 0 },
    { pred: "W3020", succ: "W3030", type: "SS", lag: 5 },
    { pred: "W3020", succ: "W3040", type: "FS", lag: 0 },
    { pred: "W3040", succ: "W3050", type: "FS", lag: 0 },
    { pred: "W3040", succ: "W3060", type: "SS", lag: 5 },
    // Concrete structures
    { pred: "W3040", succ: "W4010", type: "FS", lag: 0 },
    { pred: "W4010", succ: "W4020", type: "FS", lag: 0 },
    { pred: "W3050", succ: "W4030", type: "FS", lag: 0 },
    { pred: "W3030", succ: "W4030", type: "FS", lag: 0 },
    { pred: "W4030", succ: "W4040", type: "FS", lag: 0 },
    { pred: "W4040", succ: "W4050", type: "SS", lag: 10 },
    { pred: "W4050", succ: "W4060", type: "FS", lag: 0 },
    { pred: "W4040", succ: "W4070", type: "SS", lag: 10 },
    { pred: "W4070", succ: "W4080", type: "FS", lag: 0 },
    { pred: "W4080", succ: "W4090", type: "FS", lag: 0 },
    { pred: "W4040", succ: "W4100", type: "SS", lag: 15 },
    { pred: "W4100", succ: "W4110", type: "FS", lag: 0 },
    { pred: "W3050", succ: "W4120", type: "FS", lag: 0 },
    { pred: "W4120", succ: "W4130", type: "FS", lag: 0 },
    { pred: "W3040", succ: "W4140", type: "FS", lag: 0 },
    { pred: "W4140", succ: "W4150", type: "FS", lag: 0 },
    // Process equipment (requires delivery + structure)
    { pred: "W4020", succ: "W5010", type: "FS", lag: 0 },
    { pred: "W2040", succ: "W5020", type: "FS", lag: 0 },
    { pred: "W4040", succ: "W5020", type: "FS", lag: 0 },
    { pred: "W2040", succ: "W5030", type: "FS", lag: 0 },
    { pred: "W4060", succ: "W5030", type: "FS", lag: 0 },
    { pred: "W2060", succ: "W5040", type: "FS", lag: 0 },
    { pred: "W4090", succ: "W5040", type: "FS", lag: 0 },
    { pred: "W2080", succ: "W5050", type: "FS", lag: 0 },
    { pred: "W4130", succ: "W5050", type: "FS", lag: 0 },
    { pred: "W2100", succ: "W5060", type: "FS", lag: 0 },
    { pred: "W4110", succ: "W5060", type: "FS", lag: 0 },
    { pred: "W4090", succ: "W5070", type: "FS", lag: 0 },
    // Process piping
    { pred: "W5010", succ: "W6010", type: "SS", lag: 5 },
    { pred: "W5020", succ: "W6020", type: "SS", lag: 5 },
    { pred: "W5030", succ: "W6020", type: "SS", lag: 5 },
    { pred: "W5040", succ: "W6030", type: "SS", lag: 5 },
    { pred: "W5060", succ: "W6040", type: "SS", lag: 3 },
    { pred: "W6020", succ: "W6050", type: "SS", lag: 10 },
    { pred: "W6030", succ: "W6050", type: "SS", lag: 10 },
    // Electrical & I&C
    { pred: "W3060", succ: "W7010", type: "FS", lag: 0 },
    { pred: "W7010", succ: "W7020", type: "SS", lag: 5 },
    { pred: "W5050", succ: "W7030", type: "FS", lag: 0 },
    { pred: "W7020", succ: "W7030", type: "SS", lag: 10 },
    { pred: "W6050", succ: "W7040", type: "FS", lag: 0 },
    { pred: "W7040", succ: "W7050", type: "SS", lag: 5 },
    { pred: "W7010", succ: "W7060", type: "FS", lag: 0 },
    // Ops building
    { pred: "W4150", succ: "W8010", type: "FS", lag: 0 },
    { pred: "W8010", succ: "W8020", type: "FS", lag: 0 },
    { pred: "W8020", succ: "W8030", type: "FS", lag: 0 },
    { pred: "W7050", succ: "W8040", type: "FS", lag: 0 },
    { pred: "W8020", succ: "W8040", type: "FS", lag: 0 },
    // Testing & commissioning
    { pred: "W6020", succ: "W9010", type: "FS", lag: 0 },
    { pred: "W6030", succ: "W9010", type: "FS", lag: 0 },
    { pred: "W9010", succ: "W9020", type: "FS", lag: 0 },
    { pred: "W7030", succ: "W9020", type: "FS", lag: 0 },
    { pred: "W7060", succ: "W9030", type: "FS", lag: 0 },
    { pred: "W7020", succ: "W9030", type: "FS", lag: 0 },
    { pred: "W7050", succ: "W9040", type: "FS", lag: 0 },
    { pred: "W9020", succ: "W9040", type: "FS", lag: 0 },
    { pred: "W9040", succ: "W9050", type: "FS", lag: 0 },
    { pred: "W9050", succ: "W9060", type: "SS", lag: 10 },
    { pred: "W9050", succ: "W9070", type: "FS", lag: 0 },
    { pred: "W9060", succ: "W9080", type: "FS", lag: 0 },
    { pred: "W9070", succ: "W9080", type: "FS", lag: 0 },
    // Site restoration
    { pred: "W4060", succ: "W10010", type: "FS", lag: 0 },
    { pred: "W10010", succ: "W10020", type: "SS", lag: 3 },
    { pred: "W10020", succ: "W10030", type: "FS", lag: 0 },
    { pred: "W10030", succ: "W9070", type: "FS", lag: 0 },
  ],
  wbsNodes: [
    { code: "1.0", name: "Pre-Construction", parentCode: null, sortOrder: 10, color: "#f59e0b", textColor: "#ffffff" },
    { code: "2.0", name: "Submittals & Procurement", parentCode: null, sortOrder: 20, color: "#f97316", textColor: "#ffffff" },
    { code: "2.1", name: "Prepare & Submit", parentCode: "2.0", sortOrder: 21, color: "#fb923c", textColor: "#000000" },
    { code: "2.2", name: "Review & Approve", parentCode: "2.0", sortOrder: 22, color: "#fdba74", textColor: "#000000" },
    { code: "2.3", name: "Procurement & Lead Times", parentCode: "2.0", sortOrder: 23, color: "#fed7aa", textColor: "#000000" },
    { code: "3.0", name: "Sitework & Earthwork", parentCode: null, sortOrder: 30, color: "#84cc16", textColor: "#ffffff" },
    { code: "4.0", name: "Concrete Structures", parentCode: null, sortOrder: 40, color: "#6366f1", textColor: "#ffffff" },
    { code: "4.1", name: "Headworks", parentCode: "4.0", sortOrder: 41, color: "#818cf8", textColor: "#000000" },
    { code: "4.2", name: "Clarifier Basins", parentCode: "4.0", sortOrder: 42, color: "#a5b4fc", textColor: "#000000" },
    { code: "4.3", name: "Filter Building", parentCode: "4.0", sortOrder: 43, color: "#c7d2fe", textColor: "#000000" },
    { code: "4.4", name: "Chemical Building", parentCode: "4.0", sortOrder: 44, color: "#ddd6fe", textColor: "#000000" },
    { code: "4.5", name: "Pump Station", parentCode: "4.0", sortOrder: 45, color: "#e0e7ff", textColor: "#000000" },
    { code: "4.6", name: "Operations Building", parentCode: "4.0", sortOrder: 46, color: "#eef2ff", textColor: "#000000" },
    { code: "5.0", name: "Process Equipment", parentCode: null, sortOrder: 50, color: "#06b6d4", textColor: "#ffffff" },
    { code: "6.0", name: "Process Piping", parentCode: null, sortOrder: 60, color: "#0891b2", textColor: "#ffffff" },
    { code: "7.0", name: "Electrical & I&C", parentCode: null, sortOrder: 70, color: "#3b82f6", textColor: "#ffffff" },
    { code: "8.0", name: "Operations Building Fit-Out", parentCode: null, sortOrder: 80, color: "#8b5cf6", textColor: "#ffffff" },
    { code: "9.0", name: "Testing & Commissioning", parentCode: null, sortOrder: 90, color: "#ef4444", textColor: "#ffffff" },
    { code: "10.0", name: "Site Restoration", parentCode: null, sortOrder: 100, color: "#10b981", textColor: "#ffffff" },
  ],
  codeCategories: [
    { name: "Phase", values: ["Pre-Con", "Submittals", "Procurement", "Sitework", "Concrete", "Equipment", "Piping", "Electrical", "I&C", "Building", "Testing", "Commissioning", "Closeout"] },
    { name: "Trade", values: ["General", "Civil/Earthwork", "Concrete", "Process Equipment", "Process Piping", "Electrical", "Instrumentation", "SCADA", "HVAC", "Plumbing", "Structural"] },
    { name: "Facility", values: ["Headworks", "Clarifier #1", "Clarifier #2", "Filter Building", "Chemical Building", "Pump Station", "Operations Building", "Site"] },
  ],
};


// ═══════════════════════════════════════════════════════════════════════════════
// ELECTRICAL — Trade-specific schedule for electrical contractor
// Covers power distribution, lighting, fire alarm, low voltage
// ═══════════════════════════════════════════════════════════════════════════════

export const electricalTemplate: ScheduleTemplate = {
  name: "Electrical (Trade-Specific)",
  description: "Electrical contractor schedule — power distribution, lighting, fire alarm, low voltage, and commissioning for commercial building",
  activities: [
    // ── 1. Pre-Construction & Submittals ──
    { activityId: "E1010", name: "Electrical Kickoff Meeting", duration: 1, wbs: "1.0" },
    { activityId: "E1020", name: "Submit Switchgear & Panel Shop Drawings", duration: 10, wbs: "1.0" },
    { activityId: "E1030", name: "Switchgear Shop Drawing Review", duration: 14, wbs: "1.0" },
    { activityId: "E1040", name: "Submit Lighting Fixture Schedule", duration: 7, wbs: "1.0" },
    { activityId: "E1050", name: "Lighting Fixture Approval", duration: 10, wbs: "1.0" },
    { activityId: "E1060", name: "Submit Fire Alarm Shop Drawings", duration: 10, wbs: "1.0" },
    { activityId: "E1070", name: "Fire Alarm Review & Approval", duration: 14, wbs: "1.0" },
    { activityId: "E1080", name: "Procure Switchgear & Panels", duration: 5, wbs: "1.0" },
    { activityId: "E1090", name: "Switchgear Lead Time / Delivery", duration: 60, wbs: "1.0" },
    { activityId: "E1100", name: "Procure Lighting Fixtures", duration: 3, wbs: "1.0" },
    { activityId: "E1110", name: "Lighting Fixture Lead Time / Delivery", duration: 35, wbs: "1.0" },
    { activityId: "E1120", name: "Procure Fire Alarm Panel & Devices", duration: 3, wbs: "1.0" },
    { activityId: "E1130", name: "Fire Alarm Lead Time / Delivery", duration: 30, wbs: "1.0" },
    // ── 2. Underground & Slab ──
    { activityId: "E2010", name: "Underground Conduit — Power", duration: 8, wbs: "2.0" },
    { activityId: "E2020", name: "Underground Conduit — Telecom/Data", duration: 5, wbs: "2.0" },
    { activityId: "E2030", name: "Slab Conduit Stub-Ups", duration: 5, wbs: "2.0" },
    { activityId: "E2040", name: "Ground Grid & Electrode System", duration: 4, wbs: "2.0" },
    // ── 3. Rough-In — Level 1 ──
    { activityId: "E3010", name: "Conduit & Wire — Level 1 Power", duration: 12, wbs: "3.1" },
    { activityId: "E3020", name: "Conduit & Wire — Level 1 Lighting", duration: 8, wbs: "3.1" },
    { activityId: "E3030", name: "Branch Circuit Home Runs — Level 1", duration: 5, wbs: "3.1" },
    { activityId: "E3040", name: "Fire Alarm Rough-In — Level 1", duration: 6, wbs: "3.1" },
    { activityId: "E3050", name: "Low Voltage Rough-In — Level 1 (Data/Tel)", duration: 5, wbs: "3.1" },
    // ── 4. Rough-In — Level 2 ──
    { activityId: "E4010", name: "Conduit & Wire — Level 2 Power", duration: 12, wbs: "3.2" },
    { activityId: "E4020", name: "Conduit & Wire — Level 2 Lighting", duration: 8, wbs: "3.2" },
    { activityId: "E4030", name: "Branch Circuit Home Runs — Level 2", duration: 5, wbs: "3.2" },
    { activityId: "E4040", name: "Fire Alarm Rough-In — Level 2", duration: 6, wbs: "3.2" },
    { activityId: "E4050", name: "Low Voltage Rough-In — Level 2 (Data/Tel)", duration: 5, wbs: "3.2" },
    // ── 5. Rough-In — Level 3 ──
    { activityId: "E5010", name: "Conduit & Wire — Level 3 Power", duration: 12, wbs: "3.3" },
    { activityId: "E5020", name: "Conduit & Wire — Level 3 Lighting", duration: 8, wbs: "3.3" },
    { activityId: "E5030", name: "Branch Circuit Home Runs — Level 3", duration: 5, wbs: "3.3" },
    { activityId: "E5040", name: "Fire Alarm Rough-In — Level 3", duration: 6, wbs: "3.3" },
    { activityId: "E5050", name: "Low Voltage Rough-In — Level 3 (Data/Tel)", duration: 5, wbs: "3.3" },
    // ── 6. Main Distribution ──
    { activityId: "E6010", name: "Set Main Switchgear", duration: 3, wbs: "4.0" },
    { activityId: "E6020", name: "Set Distribution Panels — All Levels", duration: 5, wbs: "4.0" },
    { activityId: "E6030", name: "Main Feeder Pulls", duration: 8, wbs: "4.0" },
    { activityId: "E6040", name: "Transformer Installation", duration: 3, wbs: "4.0" },
    { activityId: "E6050", name: "Generator Connection & ATS", duration: 5, wbs: "4.0" },
    // ── 7. Trim-Out ──
    { activityId: "E7010", name: "Devices — Receptacles & Switches — Level 1", duration: 5, wbs: "5.1" },
    { activityId: "E7020", name: "Devices — Receptacles & Switches — Level 2", duration: 5, wbs: "5.1" },
    { activityId: "E7030", name: "Devices — Receptacles & Switches — Level 3", duration: 5, wbs: "5.1" },
    { activityId: "E7040", name: "Lighting Fixture Installation — Level 1", duration: 6, wbs: "5.2" },
    { activityId: "E7050", name: "Lighting Fixture Installation — Level 2", duration: 6, wbs: "5.2" },
    { activityId: "E7060", name: "Lighting Fixture Installation — Level 3", duration: 6, wbs: "5.2" },
    { activityId: "E7070", name: "Fire Alarm Devices & Heads — All Levels", duration: 8, wbs: "5.3" },
    { activityId: "E7080", name: "Low Voltage Terminations — All Levels", duration: 5, wbs: "5.4" },
    // ── 8. Testing & Commissioning ──
    { activityId: "E8010", name: "Megger Testing — All Feeders", duration: 3, wbs: "6.0" },
    { activityId: "E8020", name: "Panel Terminations & Labeling", duration: 5, wbs: "6.0" },
    { activityId: "E8030", name: "Circuit Testing & Verification", duration: 5, wbs: "6.0" },
    { activityId: "E8040", name: "Lighting Control Programming", duration: 3, wbs: "6.0" },
    { activityId: "E8050", name: "Fire Alarm System Testing", duration: 5, wbs: "6.0" },
    { activityId: "E8060", name: "Generator Load Bank Test", duration: 2, wbs: "6.0" },
    { activityId: "E8070", name: "Final Inspection & Punch List", duration: 5, wbs: "6.0" },
    { activityId: "E8080", name: "As-Built Drawings & O&M Manuals", duration: 5, wbs: "6.0" },
  ],
  relationships: [
    // Submittals
    { pred: "E1010", succ: "E1020", type: "FS", lag: 0 },
    { pred: "E1020", succ: "E1030", type: "FS", lag: 0 },
    { pred: "E1010", succ: "E1040", type: "FS", lag: 0 },
    { pred: "E1040", succ: "E1050", type: "FS", lag: 0 },
    { pred: "E1010", succ: "E1060", type: "FS", lag: 0 },
    { pred: "E1060", succ: "E1070", type: "FS", lag: 0 },
    { pred: "E1030", succ: "E1080", type: "FS", lag: 0 },
    { pred: "E1080", succ: "E1090", type: "FS", lag: 0 },
    { pred: "E1050", succ: "E1100", type: "FS", lag: 0 },
    { pred: "E1100", succ: "E1110", type: "FS", lag: 0 },
    { pred: "E1070", succ: "E1120", type: "FS", lag: 0 },
    { pred: "E1120", succ: "E1130", type: "FS", lag: 0 },
    // Underground
    { pred: "E1010", succ: "E2010", type: "FS", lag: 0 },
    { pred: "E2010", succ: "E2020", type: "SS", lag: 3 },
    { pred: "E2010", succ: "E2030", type: "FS", lag: 0 },
    { pred: "E2010", succ: "E2040", type: "SS", lag: 2 },
    // Rough-in Level 1
    { pred: "E2030", succ: "E3010", type: "FS", lag: 0 },
    { pred: "E3010", succ: "E3020", type: "SS", lag: 3 },
    { pred: "E3010", succ: "E3030", type: "SS", lag: 5 },
    { pred: "E3010", succ: "E3040", type: "SS", lag: 5 },
    { pred: "E3010", succ: "E3050", type: "SS", lag: 5 },
    // Rough-in Level 2
    { pred: "E3010", succ: "E4010", type: "SS", lag: 5 },
    { pred: "E4010", succ: "E4020", type: "SS", lag: 3 },
    { pred: "E4010", succ: "E4030", type: "SS", lag: 5 },
    { pred: "E4010", succ: "E4040", type: "SS", lag: 5 },
    { pred: "E4010", succ: "E4050", type: "SS", lag: 5 },
    // Rough-in Level 3
    { pred: "E4010", succ: "E5010", type: "SS", lag: 5 },
    { pred: "E5010", succ: "E5020", type: "SS", lag: 3 },
    { pred: "E5010", succ: "E5030", type: "SS", lag: 5 },
    { pred: "E5010", succ: "E5040", type: "SS", lag: 5 },
    { pred: "E5010", succ: "E5050", type: "SS", lag: 5 },
    // Main distribution (requires switchgear delivery)
    { pred: "E1090", succ: "E6010", type: "FS", lag: 0 },
    { pred: "E6010", succ: "E6020", type: "FS", lag: 0 },
    { pred: "E6010", succ: "E6030", type: "SS", lag: 2 },
    { pred: "E6030", succ: "E6040", type: "SS", lag: 3 },
    { pred: "E6010", succ: "E6050", type: "FS", lag: 0 },
    // Trim-out (requires rough-in + drywall by GC)
    { pred: "E3030", succ: "E7010", type: "FS", lag: 0 },
    { pred: "E4030", succ: "E7020", type: "FS", lag: 0 },
    { pred: "E5030", succ: "E7030", type: "FS", lag: 0 },
    { pred: "E1110", succ: "E7040", type: "FS", lag: 0 },
    { pred: "E7010", succ: "E7040", type: "SS", lag: 2 },
    { pred: "E1110", succ: "E7050", type: "FS", lag: 0 },
    { pred: "E7020", succ: "E7050", type: "SS", lag: 2 },
    { pred: "E1110", succ: "E7060", type: "FS", lag: 0 },
    { pred: "E7030", succ: "E7060", type: "SS", lag: 2 },
    { pred: "E1130", succ: "E7070", type: "FS", lag: 0 },
    { pred: "E3040", succ: "E7070", type: "FS", lag: 0 },
    { pred: "E4040", succ: "E7070", type: "FS", lag: 0 },
    { pred: "E5040", succ: "E7070", type: "FS", lag: 0 },
    { pred: "E3050", succ: "E7080", type: "FS", lag: 0 },
    { pred: "E4050", succ: "E7080", type: "FS", lag: 0 },
    { pred: "E5050", succ: "E7080", type: "FS", lag: 0 },
    // Testing & commissioning
    { pred: "E6030", succ: "E8010", type: "FS", lag: 0 },
    { pred: "E6020", succ: "E8020", type: "FS", lag: 0 },
    { pred: "E8010", succ: "E8020", type: "FS", lag: 0 },
    { pred: "E8020", succ: "E8030", type: "FS", lag: 0 },
    { pred: "E7040", succ: "E8030", type: "FS", lag: 0 },
    { pred: "E7050", succ: "E8030", type: "FS", lag: 0 },
    { pred: "E7060", succ: "E8030", type: "FS", lag: 0 },
    { pred: "E8030", succ: "E8040", type: "FS", lag: 0 },
    { pred: "E7070", succ: "E8050", type: "FS", lag: 0 },
    { pred: "E6050", succ: "E8060", type: "FS", lag: 0 },
    { pred: "E8030", succ: "E8070", type: "FS", lag: 0 },
    { pred: "E8040", succ: "E8070", type: "FS", lag: 0 },
    { pred: "E8050", succ: "E8070", type: "FS", lag: 0 },
    { pred: "E8060", succ: "E8070", type: "FS", lag: 0 },
    { pred: "E8070", succ: "E8080", type: "FS", lag: 0 },
  ],
  wbsNodes: [
    { code: "1.0", name: "Pre-Construction & Submittals", parentCode: null, sortOrder: 10, color: "#f59e0b", textColor: "#ffffff" },
    { code: "2.0", name: "Underground & Slab", parentCode: null, sortOrder: 20, color: "#84cc16", textColor: "#ffffff" },
    { code: "3.0", name: "Rough-In", parentCode: null, sortOrder: 30, color: "#3b82f6", textColor: "#ffffff" },
    { code: "3.1", name: "Level 1", parentCode: "3.0", sortOrder: 31, color: "#60a5fa", textColor: "#000000" },
    { code: "3.2", name: "Level 2", parentCode: "3.0", sortOrder: 32, color: "#93c5fd", textColor: "#000000" },
    { code: "3.3", name: "Level 3", parentCode: "3.0", sortOrder: 33, color: "#bfdbfe", textColor: "#000000" },
    { code: "4.0", name: "Main Distribution", parentCode: null, sortOrder: 40, color: "#6366f1", textColor: "#ffffff" },
    { code: "5.0", name: "Trim-Out", parentCode: null, sortOrder: 50, color: "#8b5cf6", textColor: "#ffffff" },
    { code: "5.1", name: "Devices", parentCode: "5.0", sortOrder: 51, color: "#a78bfa", textColor: "#000000" },
    { code: "5.2", name: "Lighting", parentCode: "5.0", sortOrder: 52, color: "#c4b5fd", textColor: "#000000" },
    { code: "5.3", name: "Fire Alarm", parentCode: "5.0", sortOrder: 53, color: "#ef4444", textColor: "#ffffff" },
    { code: "5.4", name: "Low Voltage", parentCode: "5.0", sortOrder: 54, color: "#06b6d4", textColor: "#ffffff" },
    { code: "6.0", name: "Testing & Commissioning", parentCode: null, sortOrder: 60, color: "#10b981", textColor: "#ffffff" },
  ],
  codeCategories: [
    { name: "Phase", values: ["Pre-Con", "Submittals", "Underground", "Rough-In", "Distribution", "Trim-Out", "Testing", "Closeout"] },
    { name: "System", values: ["Power", "Lighting", "Fire Alarm", "Low Voltage", "Generator", "Grounding"] },
    { name: "Level", values: ["Underground", "Level 1", "Level 2", "Level 3", "All Levels"] },
  ],
};


// ═══════════════════════════════════════════════════════════════════════════════
// HVAC — Trade-specific schedule for mechanical contractor
// Covers ductwork, piping, equipment, controls, TAB
// ═══════════════════════════════════════════════════════════════════════════════

export const hvacTemplate: ScheduleTemplate = {
  name: "HVAC / Mechanical (Trade-Specific)",
  description: "Mechanical contractor schedule — ductwork, hydronic piping, equipment setting, controls, insulation, TAB, and commissioning",
  activities: [
    // ── 1. Pre-Construction & Submittals ──
    { activityId: "M1010", name: "Mechanical Kickoff Meeting", duration: 1, wbs: "1.0" },
    { activityId: "M1020", name: "Submit AHU & RTU Shop Drawings", duration: 10, wbs: "1.0" },
    { activityId: "M1030", name: "AHU & RTU Review & Approval", duration: 14, wbs: "1.0" },
    { activityId: "M1040", name: "Submit Ductwork Shop Drawings", duration: 7, wbs: "1.0" },
    { activityId: "M1050", name: "Ductwork Review & Approval", duration: 10, wbs: "1.0" },
    { activityId: "M1060", name: "Submit Piping & Equipment Schedule", duration: 7, wbs: "1.0" },
    { activityId: "M1070", name: "Piping Review & Approval", duration: 10, wbs: "1.0" },
    { activityId: "M1080", name: "Procure AHUs / RTUs", duration: 5, wbs: "1.0" },
    { activityId: "M1090", name: "AHU / RTU Lead Time & Delivery", duration: 75, wbs: "1.0" },
    { activityId: "M1100", name: "Procure VAV Boxes & Terminal Units", duration: 3, wbs: "1.0" },
    { activityId: "M1110", name: "VAV Box Lead Time & Delivery", duration: 30, wbs: "1.0" },
    { activityId: "M1120", name: "Procure Chiller / Boiler", duration: 5, wbs: "1.0" },
    { activityId: "M1130", name: "Chiller / Boiler Lead Time & Delivery", duration: 90, wbs: "1.0" },
    // ── 2. Equipment Setting ──
    { activityId: "M2010", name: "Set Rooftop Units (RTUs)", duration: 5, wbs: "2.0" },
    { activityId: "M2020", name: "Set Air Handling Units (AHUs)", duration: 5, wbs: "2.0" },
    { activityId: "M2030", name: "Set Chiller / Boiler", duration: 5, wbs: "2.0" },
    { activityId: "M2040", name: "Set Pumps — Chilled & Hot Water", duration: 3, wbs: "2.0" },
    { activityId: "M2050", name: "Set Cooling Tower", duration: 3, wbs: "2.0" },
    { activityId: "M2060", name: "Set Exhaust Fans", duration: 3, wbs: "2.0" },
    // ── 3. Ductwork — Level 1 ──
    { activityId: "M3010", name: "Main Trunk Duct — Level 1", duration: 10, wbs: "3.1" },
    { activityId: "M3020", name: "Branch Duct & VAV Boxes — Level 1", duration: 8, wbs: "3.1" },
    { activityId: "M3030", name: "Flex Duct & Diffusers — Level 1", duration: 5, wbs: "3.1" },
    { activityId: "M3040", name: "Kitchen / Lab Exhaust Duct — Level 1", duration: 5, wbs: "3.1" },
    // ── 4. Ductwork — Level 2 ──
    { activityId: "M4010", name: "Main Trunk Duct — Level 2", duration: 10, wbs: "3.2" },
    { activityId: "M4020", name: "Branch Duct & VAV Boxes — Level 2", duration: 8, wbs: "3.2" },
    { activityId: "M4030", name: "Flex Duct & Diffusers — Level 2", duration: 5, wbs: "3.2" },
    // ── 5. Ductwork — Level 3 ──
    { activityId: "M5010", name: "Main Trunk Duct — Level 3", duration: 10, wbs: "3.3" },
    { activityId: "M5020", name: "Branch Duct & VAV Boxes — Level 3", duration: 8, wbs: "3.3" },
    { activityId: "M5030", name: "Flex Duct & Diffusers — Level 3", duration: 5, wbs: "3.3" },
    // ── 6. Hydronic Piping ──
    { activityId: "M6010", name: "Chilled Water Piping — Mains", duration: 12, wbs: "4.0" },
    { activityId: "M6020", name: "Hot Water Piping — Mains", duration: 10, wbs: "4.0" },
    { activityId: "M6030", name: "Branch Piping to AHUs & FCUs", duration: 8, wbs: "4.0" },
    { activityId: "M6040", name: "Condenser Water Piping", duration: 6, wbs: "4.0" },
    { activityId: "M6050", name: "Refrigerant Piping (VRF if applicable)", duration: 5, wbs: "4.0" },
    { activityId: "M6060", name: "Pipe Pressure Testing", duration: 3, wbs: "4.0" },
    // ── 7. Insulation ──
    { activityId: "M7010", name: "Duct Insulation — All Levels", duration: 12, wbs: "5.0" },
    { activityId: "M7020", name: "Pipe Insulation — All Levels", duration: 10, wbs: "5.0" },
    // ── 8. Controls & BAS ──
    { activityId: "M8010", name: "Install DDC Controllers & Sensors", duration: 10, wbs: "6.0" },
    { activityId: "M8020", name: "Control Wiring & Terminations", duration: 8, wbs: "6.0" },
    { activityId: "M8030", name: "BAS Programming & Graphics", duration: 10, wbs: "6.0" },
    { activityId: "M8040", name: "Damper Actuators & Valve Actuators", duration: 5, wbs: "6.0" },
    // ── 9. Startup & Commissioning ──
    { activityId: "M9010", name: "Equipment Startup — AHUs & RTUs", duration: 5, wbs: "7.0" },
    { activityId: "M9020", name: "Equipment Startup — Chiller & Boiler", duration: 5, wbs: "7.0" },
    { activityId: "M9030", name: "Test, Adjust & Balance (TAB)", duration: 15, wbs: "7.0" },
    { activityId: "M9040", name: "Controls Verification & Trending", duration: 8, wbs: "7.0" },
    { activityId: "M9050", name: "Commissioning Functional Testing", duration: 10, wbs: "7.0" },
    { activityId: "M9060", name: "Punch List & Corrections", duration: 5, wbs: "7.0" },
    { activityId: "M9070", name: "As-Built Drawings & O&M Manuals", duration: 5, wbs: "7.0" },
  ],
  relationships: [
    // Submittals
    { pred: "M1010", succ: "M1020", type: "FS", lag: 0 },
    { pred: "M1020", succ: "M1030", type: "FS", lag: 0 },
    { pred: "M1010", succ: "M1040", type: "FS", lag: 0 },
    { pred: "M1040", succ: "M1050", type: "FS", lag: 0 },
    { pred: "M1010", succ: "M1060", type: "FS", lag: 0 },
    { pred: "M1060", succ: "M1070", type: "FS", lag: 0 },
    { pred: "M1030", succ: "M1080", type: "FS", lag: 0 },
    { pred: "M1080", succ: "M1090", type: "FS", lag: 0 },
    { pred: "M1050", succ: "M1100", type: "FS", lag: 0 },
    { pred: "M1100", succ: "M1110", type: "FS", lag: 0 },
    { pred: "M1030", succ: "M1120", type: "FS", lag: 0 },
    { pred: "M1120", succ: "M1130", type: "FS", lag: 0 },
    // Equipment setting (requires delivery)
    { pred: "M1090", succ: "M2010", type: "FS", lag: 0 },
    { pred: "M1090", succ: "M2020", type: "FS", lag: 0 },
    { pred: "M1130", succ: "M2030", type: "FS", lag: 0 },
    { pred: "M2030", succ: "M2040", type: "SS", lag: 2 },
    { pred: "M2030", succ: "M2050", type: "SS", lag: 2 },
    { pred: "M1090", succ: "M2060", type: "FS", lag: 0 },
    // Ductwork Level 1 (requires duct approval + VAV delivery)
    { pred: "M1050", succ: "M3010", type: "FS", lag: 0 },
    { pred: "M3010", succ: "M3020", type: "SS", lag: 3 },
    { pred: "M1110", succ: "M3020", type: "FS", lag: 0 },
    { pred: "M3020", succ: "M3030", type: "FS", lag: 0 },
    { pred: "M3010", succ: "M3040", type: "SS", lag: 5 },
    // Ductwork Level 2
    { pred: "M3010", succ: "M4010", type: "SS", lag: 5 },
    { pred: "M4010", succ: "M4020", type: "SS", lag: 3 },
    { pred: "M1110", succ: "M4020", type: "FS", lag: 0 },
    { pred: "M4020", succ: "M4030", type: "FS", lag: 0 },
    // Ductwork Level 3
    { pred: "M4010", succ: "M5010", type: "SS", lag: 5 },
    { pred: "M5010", succ: "M5020", type: "SS", lag: 3 },
    { pred: "M1110", succ: "M5020", type: "FS", lag: 0 },
    { pred: "M5020", succ: "M5030", type: "FS", lag: 0 },
    // Hydronic piping
    { pred: "M1070", succ: "M6010", type: "FS", lag: 0 },
    { pred: "M2030", succ: "M6010", type: "SS", lag: 3 },
    { pred: "M6010", succ: "M6020", type: "SS", lag: 3 },
    { pred: "M2020", succ: "M6030", type: "FS", lag: 0 },
    { pred: "M6010", succ: "M6030", type: "SS", lag: 5 },
    { pred: "M2050", succ: "M6040", type: "FS", lag: 0 },
    { pred: "M6010", succ: "M6050", type: "SS", lag: 5 },
    { pred: "M6010", succ: "M6060", type: "FS", lag: 0 },
    { pred: "M6020", succ: "M6060", type: "FS", lag: 0 },
    // Insulation (follows duct and pipe)
    { pred: "M3030", succ: "M7010", type: "SS", lag: 3 },
    { pred: "M4030", succ: "M7010", type: "SS", lag: 3 },
    { pred: "M5030", succ: "M7010", type: "SS", lag: 3 },
    { pred: "M6060", succ: "M7020", type: "FS", lag: 0 },
    // Controls
    { pred: "M3020", succ: "M8010", type: "SS", lag: 5 },
    { pred: "M8010", succ: "M8020", type: "SS", lag: 3 },
    { pred: "M8020", succ: "M8030", type: "FS", lag: 0 },
    { pred: "M3020", succ: "M8040", type: "SS", lag: 3 },
    // Startup & commissioning
    { pred: "M2020", succ: "M9010", type: "FS", lag: 0 },
    { pred: "M8020", succ: "M9010", type: "FS", lag: 0 },
    { pred: "M2030", succ: "M9020", type: "FS", lag: 0 },
    { pred: "M6060", succ: "M9020", type: "FS", lag: 0 },
    { pred: "M9010", succ: "M9030", type: "FS", lag: 0 },
    { pred: "M9020", succ: "M9030", type: "FS", lag: 0 },
    { pred: "M7010", succ: "M9030", type: "FS", lag: 0 },
    { pred: "M8030", succ: "M9040", type: "FS", lag: 0 },
    { pred: "M9030", succ: "M9040", type: "FS", lag: 0 },
    { pred: "M9040", succ: "M9050", type: "FS", lag: 0 },
    { pred: "M9050", succ: "M9060", type: "FS", lag: 0 },
    { pred: "M9060", succ: "M9070", type: "FS", lag: 0 },
  ],
  wbsNodes: [
    { code: "1.0", name: "Pre-Construction & Submittals", parentCode: null, sortOrder: 10, color: "#f59e0b", textColor: "#ffffff" },
    { code: "2.0", name: "Equipment Setting", parentCode: null, sortOrder: 20, color: "#06b6d4", textColor: "#ffffff" },
    { code: "3.0", name: "Ductwork", parentCode: null, sortOrder: 30, color: "#3b82f6", textColor: "#ffffff" },
    { code: "3.1", name: "Level 1", parentCode: "3.0", sortOrder: 31, color: "#60a5fa", textColor: "#000000" },
    { code: "3.2", name: "Level 2", parentCode: "3.0", sortOrder: 32, color: "#93c5fd", textColor: "#000000" },
    { code: "3.3", name: "Level 3", parentCode: "3.0", sortOrder: 33, color: "#bfdbfe", textColor: "#000000" },
    { code: "4.0", name: "Hydronic Piping", parentCode: null, sortOrder: 40, color: "#6366f1", textColor: "#ffffff" },
    { code: "5.0", name: "Insulation", parentCode: null, sortOrder: 50, color: "#ec4899", textColor: "#ffffff" },
    { code: "6.0", name: "Controls & BAS", parentCode: null, sortOrder: 60, color: "#8b5cf6", textColor: "#ffffff" },
    { code: "7.0", name: "Startup & Commissioning", parentCode: null, sortOrder: 70, color: "#10b981", textColor: "#ffffff" },
  ],
  codeCategories: [
    { name: "Phase", values: ["Pre-Con", "Submittals", "Equipment", "Ductwork", "Piping", "Insulation", "Controls", "Startup", "TAB", "Commissioning", "Closeout"] },
    { name: "System", values: ["Supply Air", "Return Air", "Exhaust", "Chilled Water", "Hot Water", "Condenser Water", "Refrigerant", "Controls/BAS", "Kitchen Hood"] },
    { name: "Level", values: ["Roof/Penthouse", "Level 1", "Level 2", "Level 3", "Mechanical Room", "All Levels"] },
  ],
};


// ═══════════════════════════════════════════════════════════════════════════════
// CIVIL / SITEWORK — Trade-specific schedule for civil contractor
// Covers earthwork, utilities, paving, drainage, landscaping
// ═══════════════════════════════════════════════════════════════════════════════

export const civilTemplate: ScheduleTemplate = {
  name: "Civil / Sitework (Trade-Specific)",
  description: "Civil contractor schedule — earthwork, underground utilities, stormwater, paving, curb & gutter, landscaping for commercial site development",
  activities: [
    // ── 1. Pre-Construction ──
    { activityId: "C1010", name: "Pre-Construction Meeting", duration: 1, wbs: "1.0" },
    { activityId: "C1020", name: "Obtain Permits (Grading, ROW, Utility)", duration: 15, wbs: "1.0" },
    { activityId: "C1030", name: "Survey & Staking", duration: 5, wbs: "1.0" },
    { activityId: "C1040", name: "Utility Locates (811 / One-Call)", duration: 3, wbs: "1.0" },
    { activityId: "C1050", name: "Mobilization & Staging", duration: 5, wbs: "1.0" },
    // ── 2. Erosion & Sediment Control ──
    { activityId: "C2010", name: "Install Silt Fence & Construction Entrance", duration: 3, wbs: "2.0" },
    { activityId: "C2020", name: "Install Sediment Basins", duration: 5, wbs: "2.0" },
    { activityId: "C2030", name: "Install Inlet Protection", duration: 2, wbs: "2.0" },
    // ── 3. Demolition & Clearing ──
    { activityId: "C3010", name: "Tree Removal & Clearing", duration: 5, wbs: "3.0" },
    { activityId: "C3020", name: "Demolish Existing Pavement", duration: 4, wbs: "3.0" },
    { activityId: "C3030", name: "Remove Existing Utilities", duration: 5, wbs: "3.0" },
    { activityId: "C3040", name: "Strip & Stockpile Topsoil", duration: 3, wbs: "3.0" },
    // ── 4. Earthwork ──
    { activityId: "C4010", name: "Mass Excavation — Cut", duration: 15, wbs: "4.0" },
    { activityId: "C4020", name: "Structural Fill — Embankment", duration: 12, wbs: "4.0" },
    { activityId: "C4030", name: "Fine Grading — Building Pads", duration: 8, wbs: "4.0" },
    { activityId: "C4040", name: "Fine Grading — Parking & Roads", duration: 10, wbs: "4.0" },
    { activityId: "C4050", name: "Proof Roll & Compaction Testing", duration: 3, wbs: "4.0" },
    // ── 5. Storm Drainage ──
    { activityId: "C5010", name: "Storm Pipe Installation — Main Line", duration: 15, wbs: "5.1" },
    { activityId: "C5020", name: "Storm Manholes & Junction Boxes", duration: 8, wbs: "5.1" },
    { activityId: "C5030", name: "Catch Basins & Inlets", duration: 6, wbs: "5.1" },
    { activityId: "C5040", name: "Detention Pond Excavation & Grading", duration: 10, wbs: "5.1" },
    { activityId: "C5050", name: "Detention Pond Outlet Structure", duration: 5, wbs: "5.1" },
    { activityId: "C5060", name: "Headwall & Outfall", duration: 4, wbs: "5.1" },
    // ── 6. Sanitary Sewer ──
    { activityId: "C6010", name: "Sanitary Sewer Main Installation", duration: 12, wbs: "5.2" },
    { activityId: "C6020", name: "Sanitary Manholes", duration: 5, wbs: "5.2" },
    { activityId: "C6030", name: "Sanitary Service Laterals", duration: 5, wbs: "5.2" },
    { activityId: "C6040", name: "Sanitary Sewer Testing (Air/Mandrel)", duration: 3, wbs: "5.2" },
    // ── 7. Water Main ──
    { activityId: "C7010", name: "Water Main Installation", duration: 10, wbs: "5.3" },
    { activityId: "C7020", name: "Fire Hydrant Installation", duration: 4, wbs: "5.3" },
    { activityId: "C7030", name: "Water Service Connections", duration: 4, wbs: "5.3" },
    { activityId: "C7040", name: "Water Main Pressure Test & Chlorination", duration: 5, wbs: "5.3" },
    { activityId: "C7050", name: "Bacteriological Testing & Approval", duration: 7, wbs: "5.3" },
    // ── 8. Dry Utilities ──
    { activityId: "C8010", name: "Electric Ductbank & Conduit", duration: 8, wbs: "5.4" },
    { activityId: "C8020", name: "Telecom / Fiber Conduit", duration: 5, wbs: "5.4" },
    { activityId: "C8030", name: "Gas Main Extension", duration: 6, wbs: "5.4" },
    // ── 9. Paving & Hardscape ──
    { activityId: "C9010", name: "Aggregate Base Course — Roads", duration: 8, wbs: "6.1" },
    { activityId: "C9020", name: "Aggregate Base Course — Parking", duration: 6, wbs: "6.1" },
    { activityId: "C9030", name: "Curb & Gutter", duration: 8, wbs: "6.2" },
    { activityId: "C9040", name: "Asphalt Paving — Base Course", duration: 5, wbs: "6.3" },
    { activityId: "C9050", name: "Asphalt Paving — Wearing Course", duration: 4, wbs: "6.3" },
    { activityId: "C9060", name: "Concrete Sidewalks & ADA Ramps", duration: 8, wbs: "6.2" },
    { activityId: "C9070", name: "Striping & Signage", duration: 3, wbs: "6.3" },
    // ── 10. Landscaping & Restoration ──
    { activityId: "C10010", name: "Irrigation System Installation", duration: 8, wbs: "7.0" },
    { activityId: "C10020", name: "Tree & Shrub Planting", duration: 6, wbs: "7.0" },
    { activityId: "C10030", name: "Sod / Seed & Mulch", duration: 5, wbs: "7.0" },
    { activityId: "C10040", name: "Detention Pond Seeding & Stabilization", duration: 4, wbs: "7.0" },
    // ── 11. Closeout ──
    { activityId: "C11010", name: "Final Grading & Cleanup", duration: 5, wbs: "8.0" },
    { activityId: "C11020", name: "Remove Erosion Control Measures", duration: 3, wbs: "8.0" },
    { activityId: "C11030", name: "As-Built Survey", duration: 5, wbs: "8.0" },
    { activityId: "C11040", name: "Punch List & Corrections", duration: 5, wbs: "8.0" },
    { activityId: "C11050", name: "Final Inspection & Acceptance", duration: 3, wbs: "8.0" },
    { activityId: "C11060", name: "Substantial Completion", duration: 0, wbs: "8.0", activityType: "milestone" },
  ],
  relationships: [
    // Pre-con
    { pred: "C1010", succ: "C1020", type: "FS", lag: 0 },
    { pred: "C1010", succ: "C1030", type: "FS", lag: 0 },
    { pred: "C1010", succ: "C1040", type: "FS", lag: 0 },
    { pred: "C1020", succ: "C1050", type: "FS", lag: 0 },
    // Erosion control
    { pred: "C1050", succ: "C2010", type: "FS", lag: 0 },
    { pred: "C2010", succ: "C2020", type: "FS", lag: 0 },
    { pred: "C2010", succ: "C2030", type: "SS", lag: 1 },
    // Demolition
    { pred: "C2010", succ: "C3010", type: "FS", lag: 0 },
    { pred: "C1040", succ: "C3020", type: "FS", lag: 0 },
    { pred: "C3010", succ: "C3020", type: "SS", lag: 2 },
    { pred: "C1040", succ: "C3030", type: "FS", lag: 0 },
    { pred: "C3020", succ: "C3030", type: "SS", lag: 2 },
    { pred: "C3010", succ: "C3040", type: "FS", lag: 0 },
    // Earthwork
    { pred: "C3040", succ: "C4010", type: "FS", lag: 0 },
    { pred: "C4010", succ: "C4020", type: "SS", lag: 5 },
    { pred: "C4020", succ: "C4030", type: "FS", lag: 0 },
    { pred: "C4020", succ: "C4040", type: "SS", lag: 3 },
    { pred: "C4030", succ: "C4050", type: "FS", lag: 0 },
    { pred: "C4040", succ: "C4050", type: "FS", lag: 0 },
    // Storm drainage
    { pred: "C4010", succ: "C5010", type: "SS", lag: 5 },
    { pred: "C5010", succ: "C5020", type: "SS", lag: 3 },
    { pred: "C5010", succ: "C5030", type: "SS", lag: 5 },
    { pred: "C4010", succ: "C5040", type: "SS", lag: 3 },
    { pred: "C5040", succ: "C5050", type: "FS", lag: 0 },
    { pred: "C5010", succ: "C5060", type: "FS", lag: 0 },
    // Sanitary sewer
    { pred: "C4010", succ: "C6010", type: "SS", lag: 8 },
    { pred: "C6010", succ: "C6020", type: "SS", lag: 3 },
    { pred: "C6010", succ: "C6030", type: "SS", lag: 5 },
    { pred: "C6010", succ: "C6040", type: "FS", lag: 0 },
    { pred: "C6020", succ: "C6040", type: "FS", lag: 0 },
    // Water main
    { pred: "C4010", succ: "C7010", type: "SS", lag: 10 },
    { pred: "C7010", succ: "C7020", type: "SS", lag: 3 },
    { pred: "C7010", succ: "C7030", type: "SS", lag: 5 },
    { pred: "C7010", succ: "C7040", type: "FS", lag: 0 },
    { pred: "C7020", succ: "C7040", type: "FS", lag: 0 },
    { pred: "C7040", succ: "C7050", type: "FS", lag: 0 },
    // Dry utilities
    { pred: "C5010", succ: "C8010", type: "SS", lag: 5 },
    { pred: "C6010", succ: "C8010", type: "SS", lag: 5 },
    { pred: "C8010", succ: "C8020", type: "SS", lag: 3 },
    { pred: "C7010", succ: "C8030", type: "SS", lag: 5 },
    // Backfill utilities before paving
    { pred: "C5030", succ: "C9010", type: "FS", lag: 0 },
    { pred: "C6040", succ: "C9010", type: "FS", lag: 0 },
    { pred: "C7050", succ: "C9010", type: "FS", lag: 0 },
    { pred: "C8010", succ: "C9010", type: "FS", lag: 0 },
    { pred: "C4040", succ: "C9020", type: "FS", lag: 0 },
    { pred: "C9010", succ: "C9030", type: "SS", lag: 3 },
    { pred: "C9020", succ: "C9030", type: "SS", lag: 3 },
    { pred: "C9010", succ: "C9040", type: "FS", lag: 0 },
    { pred: "C9020", succ: "C9040", type: "FS", lag: 0 },
    { pred: "C9030", succ: "C9040", type: "FS", lag: 0 },
    { pred: "C9040", succ: "C9050", type: "FS", lag: 3 },
    { pred: "C9030", succ: "C9060", type: "FS", lag: 0 },
    { pred: "C9050", succ: "C9070", type: "FS", lag: 0 },
    // Landscaping
    { pred: "C9060", succ: "C10010", type: "FS", lag: 0 },
    { pred: "C10010", succ: "C10020", type: "SS", lag: 3 },
    { pred: "C10020", succ: "C10030", type: "SS", lag: 2 },
    { pred: "C5050", succ: "C10040", type: "FS", lag: 0 },
    // Closeout
    { pred: "C10030", succ: "C11010", type: "FS", lag: 0 },
    { pred: "C10040", succ: "C11010", type: "FS", lag: 0 },
    { pred: "C11010", succ: "C11020", type: "FS", lag: 0 },
    { pred: "C9070", succ: "C11030", type: "FS", lag: 0 },
    { pred: "C11010", succ: "C11030", type: "FS", lag: 0 },
    { pred: "C11020", succ: "C11040", type: "FS", lag: 0 },
    { pred: "C11030", succ: "C11040", type: "FS", lag: 0 },
    { pred: "C11040", succ: "C11050", type: "FS", lag: 0 },
    { pred: "C11050", succ: "C11060", type: "FS", lag: 0 },
  ],
  wbsNodes: [
    { code: "1.0", name: "Pre-Construction", parentCode: null, sortOrder: 10, color: "#f59e0b", textColor: "#ffffff" },
    { code: "2.0", name: "Erosion & Sediment Control", parentCode: null, sortOrder: 20, color: "#84cc16", textColor: "#ffffff" },
    { code: "3.0", name: "Demolition & Clearing", parentCode: null, sortOrder: 30, color: "#ef4444", textColor: "#ffffff" },
    { code: "4.0", name: "Earthwork", parentCode: null, sortOrder: 40, color: "#f97316", textColor: "#ffffff" },
    { code: "5.0", name: "Underground Utilities", parentCode: null, sortOrder: 50, color: "#6366f1", textColor: "#ffffff" },
    { code: "5.1", name: "Storm Drainage", parentCode: "5.0", sortOrder: 51, color: "#818cf8", textColor: "#000000" },
    { code: "5.2", name: "Sanitary Sewer", parentCode: "5.0", sortOrder: 52, color: "#a5b4fc", textColor: "#000000" },
    { code: "5.3", name: "Water Main", parentCode: "5.0", sortOrder: 53, color: "#c7d2fe", textColor: "#000000" },
    { code: "5.4", name: "Dry Utilities", parentCode: "5.0", sortOrder: 54, color: "#ddd6fe", textColor: "#000000" },
    { code: "6.0", name: "Paving & Hardscape", parentCode: null, sortOrder: 60, color: "#3b82f6", textColor: "#ffffff" },
    { code: "6.1", name: "Aggregate Base", parentCode: "6.0", sortOrder: 61, color: "#60a5fa", textColor: "#000000" },
    { code: "6.2", name: "Curb, Gutter & Sidewalk", parentCode: "6.0", sortOrder: 62, color: "#93c5fd", textColor: "#000000" },
    { code: "6.3", name: "Asphalt & Striping", parentCode: "6.0", sortOrder: 63, color: "#bfdbfe", textColor: "#000000" },
    { code: "7.0", name: "Landscaping & Irrigation", parentCode: null, sortOrder: 70, color: "#10b981", textColor: "#ffffff" },
    { code: "8.0", name: "Closeout", parentCode: null, sortOrder: 80, color: "#8b5cf6", textColor: "#ffffff" },
  ],
  codeCategories: [
    { name: "Phase", values: ["Pre-Con", "Erosion Control", "Demo", "Earthwork", "Underground", "Paving", "Concrete", "Landscaping", "Closeout"] },
    { name: "Trade", values: ["General/Civil", "Earthwork", "Storm Drainage", "Sanitary Sewer", "Water Main", "Electrical Ductbank", "Telecom", "Gas", "Paving", "Concrete Flatwork", "Landscaping"] },
    { name: "Area", values: ["Building Pad", "Parking Lot", "Access Road", "Detention Pond", "Right-of-Way", "Full Site"] },
  ],
};
