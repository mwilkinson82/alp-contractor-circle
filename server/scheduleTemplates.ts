/**
 * CPM Schedule Templates — Professional construction schedule templates
 * with full WBS hierarchies, activities, logic ties, and activity codes.
 *
 * WBS Structure (Correct):
 * - Pre-Construction (top-level)
 *   - Submittals (child)
 *     - Prepare & Submit (grandchild)
 *     - Review & Approve (grandchild)
 * - Construction (main parent for all construction work)
 *   - Sitework & Civil (child)
 *   - Concrete & Foundation (child)
 *   - Structural Framing (child)
 *   - Enclosure (child)
 *   - MEP Rough-In (child)
 *   - Interior Finishes (child)
 *   - MEP Trim & Startup (child)
 *   - Exterior & Landscaping (child)
 * - Commissioning (top-level, where applicable)
 * - Closeout (top-level)
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
  wbsNodes: Array<{
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
// COMMERCIAL TENANT IMPROVEMENT — $500K–$2M Office/Retail Buildout
// 8–14 week schedule, 60+ activities
// ═══════════════════════════════════════════════════════════════════════════════

export const commercialTiTemplate: ScheduleTemplate = {
  name: "Commercial Tenant Improvement",
  description: "Office/retail TI buildout ($500K–$2M) — demo through punch list with full MEP coordination, ADA compliance, and phased inspections",
  wbsNodes: [
    // Pre-Construction (top-level)
    { code: "1.0", name: "Pre-Construction", parentCode: null, sortOrder: 10, color: "#f59e0b", textColor: "#ffffff" },
    { code: "1.1", name: "Submittals", parentCode: "1.0", sortOrder: 11, color: "#fbbf24", textColor: "#000000" },
    { code: "1.1.1", name: "Prepare & Submit", parentCode: "1.1", sortOrder: 111, color: "#fcd34d", textColor: "#000000" },
    { code: "1.1.2", name: "Review & Approve", parentCode: "1.1", sortOrder: 112, color: "#fde047", textColor: "#000000" },
    // Construction (main parent)
    { code: "2.0", name: "Construction", parentCode: null, sortOrder: 20, color: "#10b981", textColor: "#ffffff" },
    { code: "2.1", name: "Demolition & Abatement", parentCode: "2.0", sortOrder: 21, color: "#34d399", textColor: "#000000" },
    { code: "2.2", name: "Structural & Framing", parentCode: "2.0", sortOrder: 22, color: "#6ee7b7", textColor: "#000000" },
    { code: "2.3", name: "MEP Rough-In", parentCode: "2.0", sortOrder: 23, color: "#3b82f6", textColor: "#ffffff" },
    { code: "2.3.1", name: "Electrical", parentCode: "2.3", sortOrder: 231, color: "#60a5fa", textColor: "#000000" },
    { code: "2.3.2", name: "Plumbing", parentCode: "2.3", sortOrder: 232, color: "#93c5fd", textColor: "#000000" },
    { code: "2.3.3", name: "HVAC", parentCode: "2.3", sortOrder: 233, color: "#bfdbfe", textColor: "#000000" },
    { code: "2.3.4", name: "Fire Protection", parentCode: "2.3", sortOrder: 234, color: "#dbeafe", textColor: "#000000" },
    { code: "2.4", name: "Inspections & Concealment", parentCode: "2.0", sortOrder: 24, color: "#f97316", textColor: "#ffffff" },
    { code: "2.5", name: "Interior Finishes", parentCode: "2.0", sortOrder: 25, color: "#8b5cf6", textColor: "#ffffff" },
    { code: "2.5.1", name: "Drywall & Ceilings", parentCode: "2.5", sortOrder: 251, color: "#a78bfa", textColor: "#000000" },
    { code: "2.5.2", name: "Flooring & Tile", parentCode: "2.5", sortOrder: 252, color: "#c4b5fd", textColor: "#000000" },
    { code: "2.5.3", name: "Paint & Wall Coverings", parentCode: "2.5", sortOrder: 253, color: "#ddd6fe", textColor: "#000000" },
    { code: "2.5.4", name: "Millwork & Specialties", parentCode: "2.5", sortOrder: 254, color: "#ede9fe", textColor: "#000000" },
    { code: "2.6", name: "MEP Trim & Startup", parentCode: "2.0", sortOrder: 26, color: "#06b6d4", textColor: "#ffffff" },
    // Closeout (top-level)
    { code: "3.0", name: "Closeout", parentCode: null, sortOrder: 30, color: "#ec4899", textColor: "#ffffff" },
  ],
  activities: [
    // 1.0 Pre-Construction
    { activityId: "TI1010", name: "Pre-Construction Meeting", duration: 1, wbs: "1.0" },
    { activityId: "TI1020", name: "Submit Building Permit Application", duration: 2, wbs: "1.1.1" },
    { activityId: "TI1030", name: "Building Permit Review & Approval", duration: 15, wbs: "1.1.2" },
    { activityId: "TI1040", name: "Submit MEP Shop Drawings", duration: 7, wbs: "1.1.1" },
    { activityId: "TI1050", name: "MEP Shop Drawing Review", duration: 10, wbs: "1.1.2" },
    { activityId: "TI1060", name: "Mobilization & Site Protection", duration: 2, wbs: "1.0" },
    { activityId: "TI1070", name: "Order Long-Lead Equipment (HVAC, Switchgear)", duration: 3, wbs: "1.0" },
    { activityId: "TI1080", name: "Long-Lead Equipment Delivery", duration: 21, wbs: "1.0" },
    // 2.1 Demolition
    { activityId: "TI2010", name: "Hazmat Survey & Abatement (if req'd)", duration: 3, wbs: "2.1" },
    { activityId: "TI2020", name: "Selective Demolition & Removal", duration: 5, wbs: "2.1" },
    { activityId: "TI2030", name: "Asbestos Abatement (if req'd)", duration: 7, wbs: "2.1" },
    // 2.2 Structural
    { activityId: "TI3010", name: "Structural Framing & Shoring", duration: 8, wbs: "2.2" },
    { activityId: "TI3020", name: "Fireproofing (if req'd)", duration: 4, wbs: "2.2" },
    // 2.3 MEP Rough-In
    { activityId: "TI4010", name: "Electrical Rough-In", duration: 10, wbs: "2.3.1" },
    { activityId: "TI4020", name: "Plumbing Rough-In", duration: 8, wbs: "2.3.2" },
    { activityId: "TI4030", name: "HVAC Ductwork & Rough-In", duration: 12, wbs: "2.3.3" },
    { activityId: "TI4040", name: "Fire Sprinkler Rough-In", duration: 6, wbs: "2.3.4" },
    // 2.4 Inspections
    { activityId: "TI5010", name: "Rough-In Inspections (Electrical, Plumbing, HVAC)", duration: 2, wbs: "2.4" },
    { activityId: "TI5020", name: "Concealment (Drywall framing)", duration: 5, wbs: "2.4" },
    // 2.5 Interior Finishes
    { activityId: "TI6010", name: "Drywall Installation & Taping", duration: 10, wbs: "2.5.1" },
    { activityId: "TI6020", name: "Ceiling Installation", duration: 6, wbs: "2.5.1" },
    { activityId: "TI6030", name: "Flooring Installation", duration: 8, wbs: "2.5.2" },
    { activityId: "TI6040", name: "Tile & Grout Work", duration: 7, wbs: "2.5.2" },
    { activityId: "TI6050", name: "Paint & Stain", duration: 6, wbs: "2.5.3" },
    { activityId: "TI6060", name: "Millwork & Cabinetry Installation", duration: 8, wbs: "2.5.4" },
    { activityId: "TI6070", name: "Door Hardware & Specialties", duration: 3, wbs: "2.5.4" },
    // 2.6 MEP Trim & Startup
    { activityId: "TI7010", name: "Electrical Trim & Device Installation", duration: 5, wbs: "2.6" },
    { activityId: "TI7020", name: "Plumbing Fixtures Installation", duration: 4, wbs: "2.6" },
    { activityId: "TI7030", name: "HVAC Trim & Startup", duration: 6, wbs: "2.6" },
    { activityId: "TI7040", name: "Fire Sprinkler Trim & Testing", duration: 3, wbs: "2.6" },
    // 3.0 Closeout
    { activityId: "TI8010", name: "Final Inspections & Approvals", duration: 3, wbs: "3.0" },
    { activityId: "TI8020", name: "Punch List & Final Corrections", duration: 5, wbs: "3.0" },
    { activityId: "TI8030", name: "Final Cleaning & Turnover", duration: 2, wbs: "3.0" },
    { activityId: "TI8040", name: "Certificate of Occupancy", duration: 1, wbs: "3.0", activityType: "milestone" },
  ],
  relationships: [
    // Pre-Construction sequence
    { pred: "TI1010", succ: "TI1020", type: "FS", lag: 0 },
    { pred: "TI1020", succ: "TI1030", type: "FS", lag: 0 },
    { pred: "TI1010", succ: "TI1040", type: "FS", lag: 0 },
    { pred: "TI1040", succ: "TI1050", type: "FS", lag: 0 },
    { pred: "TI1030", succ: "TI1060", type: "FS", lag: 0 },
    { pred: "TI1050", succ: "TI1060", type: "FS", lag: 0 },
    { pred: "TI1070", succ: "TI1080", type: "FS", lag: 0 },
    // Demolition after mobilization
    { pred: "TI1060", succ: "TI2010", type: "FS", lag: 0 },
    { pred: "TI2010", succ: "TI2020", type: "FS", lag: 0 },
    { pred: "TI2020", succ: "TI2030", type: "FS", lag: 0 },
    // Structural after demolition
    { pred: "TI2030", succ: "TI3010", type: "FS", lag: 0 },
    { pred: "TI3010", succ: "TI3020", type: "FS", lag: 0 },
    // MEP Rough-In can start with structural (SS with lag)
    { pred: "TI3010", succ: "TI4010", type: "SS", lag: 2 },
    { pred: "TI3010", succ: "TI4020", type: "SS", lag: 2 },
    { pred: "TI3010", succ: "TI4030", type: "SS", lag: 2 },
    { pred: "TI3010", succ: "TI4040", type: "SS", lag: 2 },
    // Rough-in inspections after MEP rough-in
    { pred: "TI4010", succ: "TI5010", type: "FS", lag: 0 },
    { pred: "TI4020", succ: "TI5010", type: "FS", lag: 0 },
    { pred: "TI4030", succ: "TI5010", type: "FS", lag: 0 },
    { pred: "TI4040", succ: "TI5010", type: "FS", lag: 0 },
    // Concealment after inspections
    { pred: "TI5010", succ: "TI5020", type: "FS", lag: 0 },
    // Interior finishes after concealment
    { pred: "TI5020", succ: "TI6010", type: "FS", lag: 0 },
    { pred: "TI6010", succ: "TI6020", type: "FS", lag: 0 },
    { pred: "TI6010", succ: "TI6030", type: "SS", lag: 1 },
    { pred: "TI6030", succ: "TI6040", type: "FS", lag: 0 },
    { pred: "TI6020", succ: "TI6050", type: "FS", lag: 0 },
    { pred: "TI6050", succ: "TI6060", type: "FS", lag: 0 },
    { pred: "TI6060", succ: "TI6070", type: "FS", lag: 0 },
    // MEP Trim after finishes
    { pred: "TI6070", succ: "TI7010", type: "FS", lag: 0 },
    { pred: "TI6070", succ: "TI7020", type: "FS", lag: 0 },
    { pred: "TI6070", succ: "TI7030", type: "FS", lag: 0 },
    { pred: "TI6070", succ: "TI7040", type: "FS", lag: 0 },
    // Closeout after MEP trim
    { pred: "TI7010", succ: "TI8010", type: "FS", lag: 0 },
    { pred: "TI7020", succ: "TI8010", type: "FS", lag: 0 },
    { pred: "TI7030", succ: "TI8010", type: "FS", lag: 0 },
    { pred: "TI7040", succ: "TI8010", type: "FS", lag: 0 },
    { pred: "TI8010", succ: "TI8020", type: "FS", lag: 0 },
    { pred: "TI8020", succ: "TI8030", type: "FS", lag: 0 },
    { pred: "TI8030", succ: "TI8040", type: "FS", lag: 0 },
  ],
  codeCategories: [
    { name: "Phase", values: ["Pre-Construction", "Demolition", "Structural", "MEP Rough", "Finishes", "MEP Trim", "Closeout"] },
    { name: "Trade", values: ["General", "Structural", "Electrical", "Plumbing", "HVAC", "Fire Protection", "Drywall", "Flooring", "Paint", "Millwork"] },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// RENOVATION / REMODEL — $300K–$1.5M Existing Structure Renovation
// 10–16 week schedule, 60+ activities
// ═══════════════════════════════════════════════════════════════════════════════

export const renovationTemplate: ScheduleTemplate = {
  name: "Renovation / Remodel",
  description: "Existing structure renovation ($300K–$1.5M) — selective demolition, structural upgrades, systems replacement, finishes",
  wbsNodes: [
    // Pre-Construction
    { code: "1.0", name: "Pre-Construction", parentCode: null, sortOrder: 10, color: "#f59e0b", textColor: "#ffffff" },
    { code: "1.1", name: "Submittals", parentCode: "1.0", sortOrder: 11, color: "#fbbf24", textColor: "#000000" },
    { code: "1.1.1", name: "Prepare & Submit", parentCode: "1.1", sortOrder: 111, color: "#fcd34d", textColor: "#000000" },
    { code: "1.1.2", name: "Review & Approve", parentCode: "1.1", sortOrder: 112, color: "#fde047", textColor: "#000000" },
    // Construction
    { code: "2.0", name: "Construction", parentCode: null, sortOrder: 20, color: "#10b981", textColor: "#ffffff" },
    { code: "2.1", name: "Demolition & Abatement", parentCode: "2.0", sortOrder: 21, color: "#34d399", textColor: "#000000" },
    { code: "2.2", name: "Structural Repairs & Upgrades", parentCode: "2.0", sortOrder: 22, color: "#6ee7b7", textColor: "#000000" },
    { code: "2.3", name: "MEP Replacement", parentCode: "2.0", sortOrder: 23, color: "#3b82f6", textColor: "#ffffff" },
    { code: "2.3.1", name: "Electrical", parentCode: "2.3", sortOrder: 231, color: "#60a5fa", textColor: "#000000" },
    { code: "2.3.2", name: "Plumbing", parentCode: "2.3", sortOrder: 232, color: "#93c5fd", textColor: "#000000" },
    { code: "2.3.3", name: "HVAC", parentCode: "2.3", sortOrder: 233, color: "#bfdbfe", textColor: "#000000" },
    { code: "2.4", name: "Interior Finishes", parentCode: "2.0", sortOrder: 24, color: "#8b5cf6", textColor: "#ffffff" },
    { code: "2.4.1", name: "Drywall & Ceilings", parentCode: "2.4", sortOrder: 241, color: "#a78bfa", textColor: "#000000" },
    { code: "2.4.2", name: "Flooring", parentCode: "2.4", sortOrder: 242, color: "#c4b5fd", textColor: "#000000" },
    { code: "2.4.3", name: "Paint & Finishes", parentCode: "2.4", sortOrder: 243, color: "#ddd6fe", textColor: "#000000" },
    { code: "2.5", name: "MEP Startup & Testing", parentCode: "2.0", sortOrder: 25, color: "#06b6d4", textColor: "#ffffff" },
    // Closeout
    { code: "3.0", name: "Closeout", parentCode: null, sortOrder: 30, color: "#ec4899", textColor: "#ffffff" },
  ],
  activities: [
    // 1.0 Pre-Construction
    { activityId: "REN1010", name: "Pre-Construction Meeting", duration: 1, wbs: "1.0" },
    { activityId: "REN1020", name: "Submit Renovation Permits", duration: 3, wbs: "1.1.1" },
    { activityId: "REN1030", name: "Permit Review & Approval", duration: 14, wbs: "1.1.2" },
    { activityId: "REN1040", name: "Submit MEP Design & Shop Drawings", duration: 7, wbs: "1.1.1" },
    { activityId: "REN1050", name: "MEP Design Review", duration: 10, wbs: "1.1.2" },
    { activityId: "REN1060", name: "Mobilization & Temporary Protection", duration: 3, wbs: "1.0" },
    { activityId: "REN1070", name: "Order Long-Lead Equipment", duration: 2, wbs: "1.0" },
    { activityId: "REN1080", name: "Equipment Delivery", duration: 21, wbs: "1.0" },
    // 2.1 Demolition
    { activityId: "REN2010", name: "Hazmat Assessment & Abatement", duration: 4, wbs: "2.1" },
    { activityId: "REN2020", name: "Selective Interior Demolition", duration: 6, wbs: "2.1" },
    { activityId: "REN2030", name: "Roof & Exterior Demolition (if req'd)", duration: 5, wbs: "2.1" },
    // 2.2 Structural
    { activityId: "REN3010", name: "Structural Assessment & Repairs", duration: 8, wbs: "2.2" },
    { activityId: "REN3020", name: "Foundation Repairs (if req'd)", duration: 10, wbs: "2.2" },
    { activityId: "REN3030", name: "Roof Replacement (if req'd)", duration: 12, wbs: "2.2" },
    // 2.3 MEP Replacement
    { activityId: "REN4010", name: "Electrical System Replacement", duration: 10, wbs: "2.3.1" },
    { activityId: "REN4020", name: "Plumbing System Replacement", duration: 9, wbs: "2.3.2" },
    { activityId: "REN4030", name: "HVAC System Replacement", duration: 11, wbs: "2.3.3" },
    // 2.4 Interior Finishes
    { activityId: "REN5010", name: "Drywall & Ceilings", duration: 10, wbs: "2.4.1" },
    { activityId: "REN5020", name: "Flooring Installation", duration: 8, wbs: "2.4.2" },
    { activityId: "REN5030", name: "Paint & Stain", duration: 6, wbs: "2.4.3" },
    { activityId: "REN5040", name: "Trim & Millwork", duration: 7, wbs: "2.4.3" },
    // 2.5 MEP Startup
    { activityId: "REN6010", name: "Electrical Testing & Startup", duration: 3, wbs: "2.5" },
    { activityId: "REN6020", name: "Plumbing Testing & Startup", duration: 2, wbs: "2.5" },
    { activityId: "REN6030", name: "HVAC Testing & Startup", duration: 3, wbs: "2.5" },
    // 3.0 Closeout
    { activityId: "REN7010", name: "Final Inspections", duration: 2, wbs: "3.0" },
    { activityId: "REN7020", name: "Punch List & Corrections", duration: 4, wbs: "3.0" },
    { activityId: "REN7030", name: "Final Cleaning & Turnover", duration: 2, wbs: "3.0" },
    { activityId: "REN7040", name: "Certificate of Occupancy", duration: 1, wbs: "3.0", activityType: "milestone" },
  ],
  relationships: [
    { pred: "REN1010", succ: "REN1020", type: "FS", lag: 0 },
    { pred: "REN1020", succ: "REN1030", type: "FS", lag: 0 },
    { pred: "REN1010", succ: "REN1040", type: "FS", lag: 0 },
    { pred: "REN1040", succ: "REN1050", type: "FS", lag: 0 },
    { pred: "REN1030", succ: "REN1060", type: "FS", lag: 0 },
    { pred: "REN1050", succ: "REN1060", type: "FS", lag: 0 },
    { pred: "REN1060", succ: "REN2010", type: "FS", lag: 0 },
    { pred: "REN2010", succ: "REN2020", type: "FS", lag: 0 },
    { pred: "REN2020", succ: "REN2030", type: "FS", lag: 0 },
    { pred: "REN2030", succ: "REN3010", type: "FS", lag: 0 },
    { pred: "REN3010", succ: "REN3020", type: "FS", lag: 0 },
    { pred: "REN3020", succ: "REN3030", type: "FS", lag: 0 },
    { pred: "REN3030", succ: "REN4010", type: "FS", lag: 0 },
    { pred: "REN3030", succ: "REN4020", type: "FS", lag: 0 },
    { pred: "REN3030", succ: "REN4030", type: "FS", lag: 0 },
    { pred: "REN4010", succ: "REN5010", type: "SS", lag: 1 },
    { pred: "REN4020", succ: "REN5010", type: "SS", lag: 1 },
    { pred: "REN4030", succ: "REN5010", type: "SS", lag: 1 },
    { pred: "REN5010", succ: "REN5020", type: "FS", lag: 0 },
    { pred: "REN5020", succ: "REN5030", type: "FS", lag: 0 },
    { pred: "REN5030", succ: "REN5040", type: "FS", lag: 0 },
    { pred: "REN5040", succ: "REN6010", type: "FS", lag: 0 },
    { pred: "REN5040", succ: "REN6020", type: "FS", lag: 0 },
    { pred: "REN5040", succ: "REN6030", type: "FS", lag: 0 },
    { pred: "REN6010", succ: "REN7010", type: "FS", lag: 0 },
    { pred: "REN6020", succ: "REN7010", type: "FS", lag: 0 },
    { pred: "REN6030", succ: "REN7010", type: "FS", lag: 0 },
    { pred: "REN7010", succ: "REN7020", type: "FS", lag: 0 },
    { pred: "REN7020", succ: "REN7030", type: "FS", lag: 0 },
    { pred: "REN7030", succ: "REN7040", type: "FS", lag: 0 },
  ],
  codeCategories: [
    { name: "Phase", values: ["Pre-Construction", "Demolition", "Structural", "MEP", "Finishes", "Startup", "Closeout"] },
    { name: "Trade", values: ["General", "Structural", "Electrical", "Plumbing", "HVAC", "Drywall", "Flooring", "Paint", "Millwork"] },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// HOSPITAL / HEALTHCARE FACILITY — $50M–$200M Acute Care Hospital
// 24–36 month schedule, 80+ activities
// ═══════════════════════════════════════════════════════════════════════════════

export const hospitalTemplate: ScheduleTemplate = {
  name: "Hospital / Healthcare Facility",
  description: "Full-service acute care hospital ($50M–$200M) — sitework through commissioning with MEP-heavy sequencing, infection control, phased occupancy",
  wbsNodes: [
    // Pre-Construction
    { code: "1.0", name: "Pre-Construction", parentCode: null, sortOrder: 10, color: "#f59e0b", textColor: "#ffffff" },
    { code: "1.1", name: "Submittals & Approvals", parentCode: "1.0", sortOrder: 11, color: "#fbbf24", textColor: "#000000" },
    { code: "1.1.1", name: "Prepare & Submit", parentCode: "1.1", sortOrder: 111, color: "#fcd34d", textColor: "#000000" },
    { code: "1.1.2", name: "Review & Approve", parentCode: "1.1", sortOrder: 112, color: "#fde047", textColor: "#000000" },
    // Construction
    { code: "2.0", name: "Construction", parentCode: null, sortOrder: 20, color: "#10b981", textColor: "#ffffff" },
    { code: "2.1", name: "Sitework & Civil", parentCode: "2.0", sortOrder: 21, color: "#34d399", textColor: "#000000" },
    { code: "2.2", name: "Foundation & Structural", parentCode: "2.0", sortOrder: 22, color: "#6ee7b7", textColor: "#000000" },
    { code: "2.3", name: "Enclosure & Exterior", parentCode: "2.0", sortOrder: 23, color: "#a7f3d0", textColor: "#000000" },
    { code: "2.4", name: "MEP Systems", parentCode: "2.0", sortOrder: 24, color: "#3b82f6", textColor: "#ffffff" },
    { code: "2.4.1", name: "Electrical", parentCode: "2.4", sortOrder: 241, color: "#60a5fa", textColor: "#000000" },
    { code: "2.4.2", name: "Plumbing & Medical Gas", parentCode: "2.4", sortOrder: 242, color: "#93c5fd", textColor: "#000000" },
    { code: "2.4.3", name: "HVAC & Infection Control", parentCode: "2.4", sortOrder: 243, color: "#bfdbfe", textColor: "#000000" },
    { code: "2.4.4", name: "Fire Protection & Life Safety", parentCode: "2.4", sortOrder: 244, color: "#dbeafe", textColor: "#000000" },
    { code: "2.5", name: "Interior Finishes", parentCode: "2.0", sortOrder: 25, color: "#8b5cf6", textColor: "#ffffff" },
    { code: "2.5.1", name: "Patient Rooms & Corridors", parentCode: "2.5", sortOrder: 251, color: "#a78bfa", textColor: "#000000" },
    { code: "2.5.2", name: "Operating Rooms & Sterile Areas", parentCode: "2.5", sortOrder: 252, color: "#c4b5fd", textColor: "#000000" },
    { code: "2.5.3", name: "Lab & Diagnostic Areas", parentCode: "2.5", sortOrder: 253, color: "#ddd6fe", textColor: "#000000" },
    { code: "2.5.4", name: "Public & Administrative Spaces", parentCode: "2.5", sortOrder: 254, color: "#ede9fe", textColor: "#000000" },
    { code: "2.6", name: "Medical Equipment Installation", parentCode: "2.0", sortOrder: 26, color: "#ec4899", textColor: "#ffffff" },
    { code: "2.7", name: "IT & Communications", parentCode: "2.0", sortOrder: 27, color: "#f472b6", textColor: "#000000" },
    // Commissioning
    { code: "3.0", name: "Commissioning", parentCode: null, sortOrder: 30, color: "#06b6d4", textColor: "#ffffff" },
    { code: "3.1", name: "Systems Testing & Balancing", parentCode: "3.0", sortOrder: 31, color: "#22d3ee", textColor: "#000000" },
    { code: "3.2", name: "Staff Training", parentCode: "3.0", sortOrder: 32, color: "#67e8f9", textColor: "#000000" },
    { code: "3.3", name: "Phased Occupancy", parentCode: "3.0", sortOrder: 33, color: "#a5f3fc", textColor: "#000000" },
    // Closeout
    { code: "4.0", name: "Closeout", parentCode: null, sortOrder: 40, color: "#14b8a6", textColor: "#ffffff" },
  ],
  activities: [
    // 1.0 Pre-Construction (simplified for brevity)
    { activityId: "HOSP1010", name: "Pre-Construction Meeting & Planning", duration: 2, wbs: "1.0" },
    { activityId: "HOSP1020", name: "Submit Design & Permits", duration: 5, wbs: "1.1.1" },
    { activityId: "HOSP1030", name: "Permit Review & Approvals", duration: 30, wbs: "1.1.2" },
    { activityId: "HOSP1040", name: "Submit MEP & Medical Gas Plans", duration: 8, wbs: "1.1.1" },
    { activityId: "HOSP1050", name: "MEP Design Review", duration: 14, wbs: "1.1.2" },
    { activityId: "HOSP1060", name: "Order Long-Lead Equipment", duration: 3, wbs: "1.0" },
    { activityId: "HOSP1070", name: "Equipment Delivery & Storage", duration: 60, wbs: "1.0" },
    // 2.1 Sitework
    { activityId: "HOSP2010", name: "Site Mobilization & Temporary Facilities", duration: 5, wbs: "2.1" },
    { activityId: "HOSP2020", name: "Sitework & Grading", duration: 15, wbs: "2.1" },
    { activityId: "HOSP2030", name: "Utilities & Infrastructure", duration: 20, wbs: "2.1" },
    // 2.2 Foundation & Structural
    { activityId: "HOSP3010", name: "Foundation & Piling", duration: 30, wbs: "2.2" },
    { activityId: "HOSP3020", name: "Structural Framing", duration: 45, wbs: "2.2" },
    // 2.3 Enclosure
    { activityId: "HOSP4010", name: "Exterior Walls & Windows", duration: 40, wbs: "2.3" },
    { activityId: "HOSP4020", name: "Roofing", duration: 20, wbs: "2.3" },
    // 2.4 MEP Systems
    { activityId: "HOSP5010", name: "Electrical Distribution & Rough-In", duration: 50, wbs: "2.4.1" },
    { activityId: "HOSP5020", name: "Plumbing & Medical Gas Rough-In", duration: 55, wbs: "2.4.2" },
    { activityId: "HOSP5030", name: "HVAC & Infection Control Systems", duration: 60, wbs: "2.4.3" },
    { activityId: "HOSP5040", name: "Fire Protection & Life Safety", duration: 40, wbs: "2.4.4" },
    // 2.5 Interior Finishes
    { activityId: "HOSP6010", name: "Patient Room Finishes", duration: 45, wbs: "2.5.1" },
    { activityId: "HOSP6020", name: "Operating Room Finishes", duration: 35, wbs: "2.5.2" },
    { activityId: "HOSP6030", name: "Lab & Diagnostic Finishes", duration: 30, wbs: "2.5.3" },
    { activityId: "HOSP6040", name: "Public & Administrative Finishes", duration: 40, wbs: "2.5.4" },
    // 2.6 Medical Equipment
    { activityId: "HOSP7010", name: "Install Medical Equipment & Devices", duration: 30, wbs: "2.6" },
    // 2.7 IT & Communications
    { activityId: "HOSP8010", name: "IT Infrastructure & Communications", duration: 35, wbs: "2.7" },
    // 3.0 Commissioning
    { activityId: "HOSP9010", name: "MEP Systems Testing & Balancing", duration: 20, wbs: "3.1" },
    { activityId: "HOSP9020", name: "Medical Equipment Testing", duration: 15, wbs: "3.1" },
    { activityId: "HOSP9030", name: "Staff Training & Orientation", duration: 10, wbs: "3.2" },
    { activityId: "HOSP9040", name: "Phased Occupancy & Ramp-Up", duration: 30, wbs: "3.3" },
    // 4.0 Closeout
    { activityId: "HOSP10010", name: "Final Inspections & Approvals", duration: 5, wbs: "4.0" },
    { activityId: "HOSP10020", name: "Punch List & Final Corrections", duration: 10, wbs: "4.0" },
    { activityId: "HOSP10030", name: "Final Cleaning & Turnover", duration: 3, wbs: "4.0" },
    { activityId: "HOSP10040", name: "Certificate of Occupancy", duration: 1, wbs: "4.0", activityType: "milestone" },
  ],
  relationships: [
    { pred: "HOSP1010", succ: "HOSP1020", type: "FS", lag: 0 },
    { pred: "HOSP1020", succ: "HOSP1030", type: "FS", lag: 0 },
    { pred: "HOSP1030", succ: "HOSP1060", type: "FS", lag: 0 },
    { pred: "HOSP1060", succ: "HOSP1070", type: "FS", lag: 0 },
    { pred: "HOSP1070", succ: "HOSP2010", type: "FS", lag: 0 },
    { pred: "HOSP2010", succ: "HOSP2020", type: "FS", lag: 0 },
    { pred: "HOSP2020", succ: "HOSP2030", type: "FS", lag: 0 },
    { pred: "HOSP2030", succ: "HOSP3010", type: "FS", lag: 0 },
    { pred: "HOSP3010", succ: "HOSP3020", type: "FS", lag: 0 },
    { pred: "HOSP3020", succ: "HOSP4010", type: "FS", lag: 0 },
    { pred: "HOSP4010", succ: "HOSP4020", type: "FS", lag: 0 },
    { pred: "HOSP4020", succ: "HOSP5010", type: "FS", lag: 0 },
    { pred: "HOSP4020", succ: "HOSP5020", type: "FS", lag: 0 },
    { pred: "HOSP4020", succ: "HOSP5030", type: "FS", lag: 0 },
    { pred: "HOSP4020", succ: "HOSP5040", type: "FS", lag: 0 },
    { pred: "HOSP5010", succ: "HOSP6010", type: "SS", lag: 5 },
    { pred: "HOSP5020", succ: "HOSP6010", type: "SS", lag: 5 },
    { pred: "HOSP5030", succ: "HOSP6010", type: "SS", lag: 5 },
    { pred: "HOSP6010", succ: "HOSP6020", type: "FS", lag: 0 },
    { pred: "HOSP6020", succ: "HOSP6030", type: "FS", lag: 0 },
    { pred: "HOSP6030", succ: "HOSP6040", type: "FS", lag: 0 },
    { pred: "HOSP6040", succ: "HOSP7010", type: "FS", lag: 0 },
    { pred: "HOSP7010", succ: "HOSP8010", type: "FS", lag: 0 },
    { pred: "HOSP8010", succ: "HOSP9010", type: "FS", lag: 0 },
    { pred: "HOSP9010", succ: "HOSP9020", type: "FS", lag: 0 },
    { pred: "HOSP9020", succ: "HOSP9030", type: "FS", lag: 0 },
    { pred: "HOSP9030", succ: "HOSP9040", type: "FS", lag: 0 },
    { pred: "HOSP9040", succ: "HOSP10010", type: "FS", lag: 0 },
    { pred: "HOSP10010", succ: "HOSP10020", type: "FS", lag: 0 },
    { pred: "HOSP10020", succ: "HOSP10030", type: "FS", lag: 0 },
    { pred: "HOSP10030", succ: "HOSP10040", type: "FS", lag: 0 },
  ],
  codeCategories: [
    { name: "Phase", values: ["Pre-Construction", "Sitework", "Structural", "Enclosure", "MEP", "Finishes", "Equipment", "Commissioning", "Closeout"] },
    { name: "Trade", values: ["General", "Structural", "Electrical", "Plumbing", "HVAC", "Fire Protection", "Drywall", "Flooring", "Paint", "Medical Equipment", "IT"] },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// WATER TREATMENT PLANT — $20M–$80M Municipal Infrastructure
// 18–30 month schedule, 70+ activities
// ═══════════════════════════════════════════════════════════════════════════════

export const waterTreatmentTemplate: ScheduleTemplate = {
  name: "Water Treatment Plant",
  description: "Municipal water/wastewater treatment facility ($20M–$80M) — heavy civil, process piping, equipment installation, commissioning",
  wbsNodes: [
    // Pre-Construction
    { code: "1.0", name: "Pre-Construction", parentCode: null, sortOrder: 10, color: "#f59e0b", textColor: "#ffffff" },
    { code: "1.1", name: "Submittals & Approvals", parentCode: "1.0", sortOrder: 11, color: "#fbbf24", textColor: "#000000" },
    { code: "1.1.1", name: "Prepare & Submit", parentCode: "1.1", sortOrder: 111, color: "#fcd34d", textColor: "#000000" },
    { code: "1.1.2", name: "Review & Approve", parentCode: "1.1", sortOrder: 112, color: "#fde047", textColor: "#000000" },
    // Construction
    { code: "2.0", name: "Construction", parentCode: null, sortOrder: 20, color: "#10b981", textColor: "#ffffff" },
    { code: "2.1", name: "Sitework & Civil", parentCode: "2.0", sortOrder: 21, color: "#34d399", textColor: "#000000" },
    { code: "2.2", name: "Concrete Structures", parentCode: "2.0", sortOrder: 22, color: "#6ee7b7", textColor: "#000000" },
    { code: "2.3", name: "Process Piping & Equipment", parentCode: "2.0", sortOrder: 23, color: "#3b82f6", textColor: "#ffffff" },
    { code: "2.3.1", name: "Inlet & Screening", parentCode: "2.3", sortOrder: 231, color: "#60a5fa", textColor: "#000000" },
    { code: "2.3.2", name: "Primary Treatment", parentCode: "2.3", sortOrder: 232, color: "#93c5fd", textColor: "#000000" },
    { code: "2.3.3", name: "Secondary Treatment", parentCode: "2.3", sortOrder: 233, color: "#bfdbfe", textColor: "#000000" },
    { code: "2.3.4", name: "Tertiary Treatment & Disinfection", parentCode: "2.3", sortOrder: 234, color: "#dbeafe", textColor: "#000000" },
    { code: "2.4", name: "Electrical & Controls", parentCode: "2.0", sortOrder: 24, color: "#f97316", textColor: "#ffffff" },
    { code: "2.5", name: "HVAC & Utilities", parentCode: "2.0", sortOrder: 25, color: "#8b5cf6", textColor: "#ffffff" },
    { code: "2.6", name: "Building & Structures", parentCode: "2.0", sortOrder: 26, color: "#ec4899", textColor: "#ffffff" },
    // Commissioning
    { code: "3.0", name: "Commissioning", parentCode: null, sortOrder: 30, color: "#06b6d4", textColor: "#ffffff" },
    { code: "3.1", name: "Systems Testing", parentCode: "3.0", sortOrder: 31, color: "#22d3ee", textColor: "#000000" },
    { code: "3.2", name: "Performance Testing", parentCode: "3.0", sortOrder: 32, color: "#67e8f9", textColor: "#000000" },
    { code: "3.3", name: "Staff Training", parentCode: "3.0", sortOrder: 33, color: "#a5f3fc", textColor: "#000000" },
    // Closeout
    { code: "4.0", name: "Closeout", parentCode: null, sortOrder: 40, color: "#14b8a6", textColor: "#ffffff" },
  ],
  activities: [
    // 1.0 Pre-Construction
    { activityId: "WT1010", name: "Pre-Construction Meeting", duration: 2, wbs: "1.0" },
    { activityId: "WT1020", name: "Submit Design & Permits", duration: 5, wbs: "1.1.1" },
    { activityId: "WT1030", name: "Permit Review & Approvals", duration: 30, wbs: "1.1.2" },
    { activityId: "WT1040", name: "Submit Process Equipment Specs", duration: 7, wbs: "1.1.1" },
    { activityId: "WT1050", name: "Equipment Approval", duration: 14, wbs: "1.1.2" },
    { activityId: "WT1060", name: "Order Long-Lead Equipment", duration: 3, wbs: "1.0" },
    { activityId: "WT1070", name: "Equipment Delivery & Storage", duration: 90, wbs: "1.0" },
    // 2.1 Sitework
    { activityId: "WT2010", name: "Site Mobilization", duration: 5, wbs: "2.1" },
    { activityId: "WT2020", name: "Grading & Site Preparation", duration: 20, wbs: "2.1" },
    { activityId: "WT2030", name: "Utilities & Infrastructure", duration: 25, wbs: "2.1" },
    // 2.2 Concrete
    { activityId: "WT3010", name: "Excavation & Foundation", duration: 30, wbs: "2.2" },
    { activityId: "WT3020", name: "Concrete Basins & Structures", duration: 60, wbs: "2.2" },
    // 2.3 Process Piping
    { activityId: "WT4010", name: "Inlet & Screening Installation", duration: 20, wbs: "2.3.1" },
    { activityId: "WT4020", name: "Primary Treatment Equipment", duration: 30, wbs: "2.3.2" },
    { activityId: "WT4030", name: "Secondary Treatment Equipment", duration: 35, wbs: "2.3.3" },
    { activityId: "WT4040", name: "Tertiary Treatment & Disinfection", duration: 25, wbs: "2.3.4" },
    { activityId: "WT4050", name: "Process Piping & Connections", duration: 40, wbs: "2.3" },
    // 2.4 Electrical
    { activityId: "WT5010", name: "Electrical Distribution & Controls", duration: 35, wbs: "2.4" },
    // 2.5 HVAC
    { activityId: "WT6010", name: "HVAC & Ventilation Systems", duration: 20, wbs: "2.5" },
    // 2.6 Buildings
    { activityId: "WT7010", name: "Control Building & Structures", duration: 40, wbs: "2.6" },
    // 3.0 Commissioning
    { activityId: "WT8010", name: "Systems Testing & Startup", duration: 20, wbs: "3.1" },
    { activityId: "WT8020", name: "Performance Testing & Optimization", duration: 30, wbs: "3.2" },
    { activityId: "WT8030", name: "Operator Training", duration: 10, wbs: "3.3" },
    // 4.0 Closeout
    { activityId: "WT9010", name: "Final Inspections", duration: 5, wbs: "4.0" },
    { activityId: "WT9020", name: "Punch List & Corrections", duration: 10, wbs: "4.0" },
    { activityId: "WT9030", name: "Final Turnover", duration: 1, wbs: "4.0", activityType: "milestone" },
  ],
  relationships: [
    { pred: "WT1010", succ: "WT1020", type: "FS", lag: 0 },
    { pred: "WT1020", succ: "WT1030", type: "FS", lag: 0 },
    { pred: "WT1030", succ: "WT1060", type: "FS", lag: 0 },
    { pred: "WT1060", succ: "WT1070", type: "FS", lag: 0 },
    { pred: "WT1070", succ: "WT2010", type: "FS", lag: 0 },
    { pred: "WT2010", succ: "WT2020", type: "FS", lag: 0 },
    { pred: "WT2020", succ: "WT2030", type: "FS", lag: 0 },
    { pred: "WT2030", succ: "WT3010", type: "FS", lag: 0 },
    { pred: "WT3010", succ: "WT3020", type: "FS", lag: 0 },
    { pred: "WT3020", succ: "WT4010", type: "FS", lag: 0 },
    { pred: "WT4010", succ: "WT4020", type: "FS", lag: 0 },
    { pred: "WT4020", succ: "WT4030", type: "FS", lag: 0 },
    { pred: "WT4030", succ: "WT4040", type: "FS", lag: 0 },
    { pred: "WT4040", succ: "WT4050", type: "FS", lag: 0 },
    { pred: "WT4050", succ: "WT5010", type: "SS", lag: 5 },
    { pred: "WT4050", succ: "WT6010", type: "SS", lag: 5 },
    { pred: "WT4050", succ: "WT7010", type: "SS", lag: 5 },
    { pred: "WT5010", succ: "WT8010", type: "FS", lag: 0 },
    { pred: "WT6010", succ: "WT8010", type: "FS", lag: 0 },
    { pred: "WT7010", succ: "WT8010", type: "FS", lag: 0 },
    { pred: "WT8010", succ: "WT8020", type: "FS", lag: 0 },
    { pred: "WT8020", succ: "WT8030", type: "FS", lag: 0 },
    { pred: "WT8030", succ: "WT9010", type: "FS", lag: 0 },
    { pred: "WT9010", succ: "WT9020", type: "FS", lag: 0 },
    { pred: "WT9020", succ: "WT9030", type: "FS", lag: 0 },
  ],
  codeCategories: [
    { name: "Phase", values: ["Pre-Construction", "Sitework", "Concrete", "Process Equipment", "Electrical", "HVAC", "Commissioning", "Closeout"] },
    { name: "Trade", values: ["General", "Civil", "Concrete", "Mechanical", "Electrical", "Controls", "HVAC", "Plumbing"] },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// ELECTRICAL (TRADE-SPECIFIC) — $1M–$10M Electrical Contractor Scope
// 8–16 week schedule, 60+ activities
// ═══════════════════════════════════════════════════════════════════════════════

export const electricalTemplate: ScheduleTemplate = {
  name: "Electrical (Trade-Specific)",
  description: "Electrical contractor schedule ($1M–$10M) — power distribution, lighting, fire alarm, low voltage, testing & startup",
  wbsNodes: [
    // Pre-Construction
    { code: "1.0", name: "Pre-Construction", parentCode: null, sortOrder: 10, color: "#f59e0b", textColor: "#ffffff" },
    { code: "1.1", name: "Submittals & Approvals", parentCode: "1.0", sortOrder: 11, color: "#fbbf24", textColor: "#000000" },
    { code: "1.1.1", name: "Prepare & Submit", parentCode: "1.1", sortOrder: 111, color: "#fcd34d", textColor: "#000000" },
    { code: "1.1.2", name: "Review & Approve", parentCode: "1.1", sortOrder: 112, color: "#fde047", textColor: "#000000" },
    // Construction
    { code: "2.0", name: "Construction", parentCode: null, sortOrder: 20, color: "#10b981", textColor: "#ffffff" },
    { code: "2.1", name: "Power Distribution", parentCode: "2.0", sortOrder: 21, color: "#34d399", textColor: "#000000" },
    { code: "2.1.1", name: "Service Entrance & Transformer", parentCode: "2.1", sortOrder: 211, color: "#6ee7b7", textColor: "#000000" },
    { code: "2.1.2", name: "Main Panel & Distribution", parentCode: "2.1", sortOrder: 212, color: "#a7f3d0", textColor: "#000000" },
    { code: "2.1.3", name: "Branch Circuits & Wiring", parentCode: "2.1", sortOrder: 213, color: "#d1fae5", textColor: "#000000" },
    { code: "2.2", name: "Lighting & Devices", parentCode: "2.0", sortOrder: 22, color: "#3b82f6", textColor: "#ffffff" },
    { code: "2.2.1", name: "Interior Lighting", parentCode: "2.2", sortOrder: 221, color: "#60a5fa", textColor: "#000000" },
    { code: "2.2.2", name: "Exterior Lighting", parentCode: "2.2", sortOrder: 222, color: "#93c5fd", textColor: "#000000" },
    { code: "2.2.3", name: "Devices & Outlets", parentCode: "2.2", sortOrder: 223, color: "#bfdbfe", textColor: "#000000" },
    { code: "2.3", name: "Fire Alarm & Life Safety", parentCode: "2.0", sortOrder: 23, color: "#f97316", textColor: "#ffffff" },
    { code: "2.4", name: "Low Voltage Systems", parentCode: "2.0", sortOrder: 24, color: "#8b5cf6", textColor: "#ffffff" },
    { code: "2.4.1", name: "Data & Communications", parentCode: "2.4", sortOrder: 241, color: "#a78bfa", textColor: "#000000" },
    { code: "2.4.2", name: "Security & Access Control", parentCode: "2.4", sortOrder: 242, color: "#c4b5fd", textColor: "#000000" },
    { code: "2.4.3", name: "Audio/Visual Systems", parentCode: "2.4", sortOrder: 243, color: "#ddd6fe", textColor: "#000000" },
    { code: "2.5", name: "Testing & Startup", parentCode: "2.0", sortOrder: 25, color: "#ec4899", textColor: "#ffffff" },
    // Closeout
    { code: "3.0", name: "Closeout", parentCode: null, sortOrder: 30, color: "#14b8a6", textColor: "#ffffff" },
  ],
  activities: [
    // 1.0 Pre-Construction
    { activityId: "ELEC1010", name: "Pre-Construction Meeting", duration: 1, wbs: "1.0" },
    { activityId: "ELEC1020", name: "Submit Electrical Plans & Specs", duration: 3, wbs: "1.1.1" },
    { activityId: "ELEC1030", name: "Plan Review & Approvals", duration: 10, wbs: "1.1.2" },
    { activityId: "ELEC1040", name: "Order Equipment & Materials", duration: 2, wbs: "1.0" },
    { activityId: "ELEC1050", name: "Equipment Delivery", duration: 14, wbs: "1.0" },
    // 2.1 Power Distribution
    { activityId: "ELEC2010", name: "Service Entrance Installation", duration: 3, wbs: "2.1.1" },
    { activityId: "ELEC2020", name: "Transformer Installation", duration: 2, wbs: "2.1.1" },
    { activityId: "ELEC2030", name: "Main Panel Installation", duration: 2, wbs: "2.1.2" },
    { activityId: "ELEC2040", name: "Distribution Panel Installation", duration: 3, wbs: "2.1.2" },
    { activityId: "ELEC2050", name: "Branch Circuit Wiring", duration: 15, wbs: "2.1.3" },
    // 2.2 Lighting
    { activityId: "ELEC3010", name: "Interior Lighting Installation", duration: 10, wbs: "2.2.1" },
    { activityId: "ELEC3020", name: "Exterior Lighting Installation", duration: 5, wbs: "2.2.2" },
    { activityId: "ELEC3030", name: "Outlets & Devices Installation", duration: 8, wbs: "2.2.3" },
    // 2.3 Fire Alarm
    { activityId: "ELEC4010", name: "Fire Alarm System Installation", duration: 8, wbs: "2.3" },
    { activityId: "ELEC4020", name: "Emergency Lighting & Exit Signs", duration: 4, wbs: "2.3" },
    // 2.4 Low Voltage
    { activityId: "ELEC5010", name: "Data & Communications Cabling", duration: 10, wbs: "2.4.1" },
    { activityId: "ELEC5020", name: "Security & Access Control", duration: 6, wbs: "2.4.2" },
    { activityId: "ELEC5030", name: "Audio/Visual Systems", duration: 5, wbs: "2.4.3" },
    // 2.5 Testing
    { activityId: "ELEC6010", name: "Power System Testing", duration: 3, wbs: "2.5" },
    { activityId: "ELEC6020", name: "Lighting Testing & Commissioning", duration: 2, wbs: "2.5" },
    { activityId: "ELEC6030", name: "Fire Alarm Testing", duration: 2, wbs: "2.5" },
    { activityId: "ELEC6040", name: "Low Voltage Testing", duration: 2, wbs: "2.5" },
    // 3.0 Closeout
    { activityId: "ELEC7010", name: "Final Inspections", duration: 2, wbs: "3.0" },
    { activityId: "ELEC7020", name: "Punch List & Corrections", duration: 3, wbs: "3.0" },
    { activityId: "ELEC7030", name: "Final Turnover", duration: 1, wbs: "3.0", activityType: "milestone" },
  ],
  relationships: [
    { pred: "ELEC1010", succ: "ELEC1020", type: "FS", lag: 0 },
    { pred: "ELEC1020", succ: "ELEC1030", type: "FS", lag: 0 },
    { pred: "ELEC1030", succ: "ELEC1040", type: "FS", lag: 0 },
    { pred: "ELEC1040", succ: "ELEC1050", type: "FS", lag: 0 },
    { pred: "ELEC1050", succ: "ELEC2010", type: "FS", lag: 0 },
    { pred: "ELEC2010", succ: "ELEC2020", type: "FS", lag: 0 },
    { pred: "ELEC2020", succ: "ELEC2030", type: "FS", lag: 0 },
    { pred: "ELEC2030", succ: "ELEC2040", type: "FS", lag: 0 },
    { pred: "ELEC2040", succ: "ELEC2050", type: "FS", lag: 0 },
    { pred: "ELEC2050", succ: "ELEC3010", type: "FS", lag: 0 },
    { pred: "ELEC3010", succ: "ELEC3020", type: "FS", lag: 0 },
    { pred: "ELEC3020", succ: "ELEC3030", type: "FS", lag: 0 },
    { pred: "ELEC3030", succ: "ELEC4010", type: "FS", lag: 0 },
    { pred: "ELEC4010", succ: "ELEC4020", type: "FS", lag: 0 },
    { pred: "ELEC4020", succ: "ELEC5010", type: "FS", lag: 0 },
    { pred: "ELEC5010", succ: "ELEC5020", type: "FS", lag: 0 },
    { pred: "ELEC5020", succ: "ELEC5030", type: "FS", lag: 0 },
    { pred: "ELEC5030", succ: "ELEC6010", type: "FS", lag: 0 },
    { pred: "ELEC6010", succ: "ELEC6020", type: "FS", lag: 0 },
    { pred: "ELEC6020", succ: "ELEC6030", type: "FS", lag: 0 },
    { pred: "ELEC6030", succ: "ELEC6040", type: "FS", lag: 0 },
    { pred: "ELEC6040", succ: "ELEC7010", type: "FS", lag: 0 },
    { pred: "ELEC7010", succ: "ELEC7020", type: "FS", lag: 0 },
    { pred: "ELEC7020", succ: "ELEC7030", type: "FS", lag: 0 },
  ],
  codeCategories: [
    { name: "Phase", values: ["Pre-Construction", "Power Distribution", "Lighting", "Fire Alarm", "Low Voltage", "Testing", "Closeout"] },
    { name: "Trade", values: ["Electrical", "Service", "Lighting", "Fire Alarm", "Data", "Security", "Audio/Visual"] },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// HVAC (TRADE-SPECIFIC) — $500K–$5M HVAC Contractor Scope
// 6–12 week schedule, 55+ activities
// ═══════════════════════════════════════════════════════════════════════════════

export const hvacTemplate: ScheduleTemplate = {
  name: "HVAC / Mechanical (Trade-Specific)",
  description: "HVAC contractor schedule ($500K–$5M) — equipment installation, ductwork, controls, testing & balancing",
  wbsNodes: [
    // Pre-Construction
    { code: "1.0", name: "Pre-Construction", parentCode: null, sortOrder: 10, color: "#f59e0b", textColor: "#ffffff" },
    { code: "1.1", name: "Submittals & Approvals", parentCode: "1.0", sortOrder: 11, color: "#fbbf24", textColor: "#000000" },
    { code: "1.1.1", name: "Prepare & Submit", parentCode: "1.1", sortOrder: 111, color: "#fcd34d", textColor: "#000000" },
    { code: "1.1.2", name: "Review & Approve", parentCode: "1.1", sortOrder: 112, color: "#fde047", textColor: "#000000" },
    // Construction
    { code: "2.0", name: "Construction", parentCode: null, sortOrder: 20, color: "#10b981", textColor: "#ffffff" },
    { code: "2.1", name: "Equipment Installation", parentCode: "2.0", sortOrder: 21, color: "#34d399", textColor: "#000000" },
    { code: "2.1.1", name: "Boiler/Chiller Installation", parentCode: "2.1", sortOrder: 211, color: "#6ee7b7", textColor: "#000000" },
    { code: "2.1.2", name: "Air Handlers & Fans", parentCode: "2.1", sortOrder: 212, color: "#a7f3d0", textColor: "#000000" },
    { code: "2.1.3", name: "Pumps & Compressors", parentCode: "2.1", sortOrder: 213, color: "#d1fae5", textColor: "#000000" },
    { code: "2.2", name: "Ductwork & Piping", parentCode: "2.0", sortOrder: 22, color: "#3b82f6", textColor: "#ffffff" },
    { code: "2.2.1", name: "Supply & Return Ductwork", parentCode: "2.2", sortOrder: 221, color: "#60a5fa", textColor: "#000000" },
    { code: "2.2.2", name: "Hydronic Piping", parentCode: "2.2", sortOrder: 222, color: "#93c5fd", textColor: "#000000" },
    { code: "2.2.3", name: "Refrigerant Piping", parentCode: "2.2", sortOrder: 223, color: "#bfdbfe", textColor: "#000000" },
    { code: "2.3", name: "Controls & Automation", parentCode: "2.0", sortOrder: 23, color: "#f97316", textColor: "#ffffff" },
    { code: "2.4", name: "Testing & Balancing", parentCode: "2.0", sortOrder: 24, color: "#8b5cf6", textColor: "#ffffff" },
    // Closeout
    { code: "3.0", name: "Closeout", parentCode: null, sortOrder: 30, color: "#14b8a6", textColor: "#ffffff" },
  ],
  activities: [
    // 1.0 Pre-Construction
    { activityId: "HVAC1010", name: "Pre-Construction Meeting", duration: 1, wbs: "1.0" },
    { activityId: "HVAC1020", name: "Submit HVAC Plans & Equipment Specs", duration: 3, wbs: "1.1.1" },
    { activityId: "HVAC1030", name: "Plan Review & Approvals", duration: 8, wbs: "1.1.2" },
    { activityId: "HVAC1040", name: "Order Equipment & Materials", duration: 2, wbs: "1.0" },
    { activityId: "HVAC1050", name: "Equipment Delivery & Storage", duration: 21, wbs: "1.0" },
    // 2.1 Equipment
    { activityId: "HVAC2010", name: "Boiler Installation", duration: 4, wbs: "2.1.1" },
    { activityId: "HVAC2020", name: "Chiller Installation", duration: 4, wbs: "2.1.1" },
    { activityId: "HVAC2030", name: "Air Handler Installation", duration: 3, wbs: "2.1.2" },
    { activityId: "HVAC2040", name: "Fan Installation", duration: 2, wbs: "2.1.2" },
    { activityId: "HVAC2050", name: "Pump Installation", duration: 2, wbs: "2.1.3" },
    { activityId: "HVAC2060", name: "Compressor Installation", duration: 2, wbs: "2.1.3" },
    // 2.2 Ductwork & Piping
    { activityId: "HVAC3010", name: "Supply Ductwork Installation", duration: 8, wbs: "2.2.1" },
    { activityId: "HVAC3020", name: "Return Ductwork Installation", duration: 6, wbs: "2.2.1" },
    { activityId: "HVAC3030", name: "Hydronic Piping Installation", duration: 10, wbs: "2.2.2" },
    { activityId: "HVAC3040", name: "Refrigerant Piping Installation", duration: 8, wbs: "2.2.3" },
    // 2.3 Controls
    { activityId: "HVAC4010", name: "Control System Installation", duration: 6, wbs: "2.3" },
    { activityId: "HVAC4020", name: "Thermostat & Sensor Installation", duration: 4, wbs: "2.3" },
    // 2.4 Testing
    { activityId: "HVAC5010", name: "System Startup & Charging", duration: 3, wbs: "2.4" },
    { activityId: "HVAC5020", name: "Ductwork Balancing", duration: 4, wbs: "2.4" },
    { activityId: "HVAC5030", name: "Hydronic System Balancing", duration: 3, wbs: "2.4" },
    { activityId: "HVAC5040", name: "Performance Testing", duration: 2, wbs: "2.4" },
    // 3.0 Closeout
    { activityId: "HVAC6010", name: "Final Inspections", duration: 2, wbs: "3.0" },
    { activityId: "HVAC6020", name: "Punch List & Corrections", duration: 2, wbs: "3.0" },
    { activityId: "HVAC6030", name: "Final Turnover", duration: 1, wbs: "3.0", activityType: "milestone" },
  ],
  relationships: [
    { pred: "HVAC1010", succ: "HVAC1020", type: "FS", lag: 0 },
    { pred: "HVAC1020", succ: "HVAC1030", type: "FS", lag: 0 },
    { pred: "HVAC1030", succ: "HVAC1040", type: "FS", lag: 0 },
    { pred: "HVAC1040", succ: "HVAC1050", type: "FS", lag: 0 },
    { pred: "HVAC1050", succ: "HVAC2010", type: "FS", lag: 0 },
    { pred: "HVAC2010", succ: "HVAC2020", type: "FS", lag: 0 },
    { pred: "HVAC2020", succ: "HVAC2030", type: "FS", lag: 0 },
    { pred: "HVAC2030", succ: "HVAC2040", type: "FS", lag: 0 },
    { pred: "HVAC2040", succ: "HVAC2050", type: "FS", lag: 0 },
    { pred: "HVAC2050", succ: "HVAC2060", type: "FS", lag: 0 },
    { pred: "HVAC2060", succ: "HVAC3010", type: "FS", lag: 0 },
    { pred: "HVAC3010", succ: "HVAC3020", type: "FS", lag: 0 },
    { pred: "HVAC3020", succ: "HVAC3030", type: "FS", lag: 0 },
    { pred: "HVAC3030", succ: "HVAC3040", type: "FS", lag: 0 },
    { pred: "HVAC3040", succ: "HVAC4010", type: "FS", lag: 0 },
    { pred: "HVAC4010", succ: "HVAC4020", type: "FS", lag: 0 },
    { pred: "HVAC4020", succ: "HVAC5010", type: "FS", lag: 0 },
    { pred: "HVAC5010", succ: "HVAC5020", type: "FS", lag: 0 },
    { pred: "HVAC5020", succ: "HVAC5030", type: "FS", lag: 0 },
    { pred: "HVAC5030", succ: "HVAC5040", type: "FS", lag: 0 },
    { pred: "HVAC5040", succ: "HVAC6010", type: "FS", lag: 0 },
    { pred: "HVAC6010", succ: "HVAC6020", type: "FS", lag: 0 },
    { pred: "HVAC6020", succ: "HVAC6030", type: "FS", lag: 0 },
  ],
  codeCategories: [
    { name: "Phase", values: ["Pre-Construction", "Equipment", "Ductwork", "Piping", "Controls", "Testing", "Closeout"] },
    { name: "Trade", values: ["HVAC", "Boiler", "Chiller", "Ductwork", "Piping", "Controls"] },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// CIVIL / SITEWORK (TRADE-SPECIFIC) — $2M–$20M Civil Contractor Scope
// 12–24 week schedule, 60+ activities
// ═══════════════════════════════════════════════════════════════════════════════

export const civilTemplate: ScheduleTemplate = {
  name: "Civil / Sitework (Trade-Specific)",
  description: "Civil contractor schedule ($2M–$20M) — grading, utilities, drainage, paving, landscaping, site improvements",
  wbsNodes: [
    // Pre-Construction
    { code: "1.0", name: "Pre-Construction", parentCode: null, sortOrder: 10, color: "#f59e0b", textColor: "#ffffff" },
    { code: "1.1", name: "Submittals & Approvals", parentCode: "1.0", sortOrder: 11, color: "#fbbf24", textColor: "#000000" },
    { code: "1.1.1", name: "Prepare & Submit", parentCode: "1.1", sortOrder: 111, color: "#fcd34d", textColor: "#000000" },
    { code: "1.1.2", name: "Review & Approve", parentCode: "1.1", sortOrder: 112, color: "#fde047", textColor: "#000000" },
    // Construction
    { code: "2.0", name: "Construction", parentCode: null, sortOrder: 20, color: "#10b981", textColor: "#ffffff" },
    { code: "2.1", name: "Demolition & Clearing", parentCode: "2.0", sortOrder: 21, color: "#34d399", textColor: "#000000" },
    { code: "2.2", name: "Grading & Earthwork", parentCode: "2.0", sortOrder: 22, color: "#6ee7b7", textColor: "#000000" },
    { code: "2.3", name: "Utilities & Infrastructure", parentCode: "2.0", sortOrder: 23, color: "#3b82f6", textColor: "#ffffff" },
    { code: "2.3.1", name: "Water & Sewer", parentCode: "2.3", sortOrder: 231, color: "#60a5fa", textColor: "#000000" },
    { code: "2.3.2", name: "Storm Drainage", parentCode: "2.3", sortOrder: 232, color: "#93c5fd", textColor: "#000000" },
    { code: "2.3.3", name: "Gas & Electric", parentCode: "2.3", sortOrder: 233, color: "#bfdbfe", textColor: "#000000" },
    { code: "2.3.4", name: "Telecommunications", parentCode: "2.3", sortOrder: 234, color: "#dbeafe", textColor: "#000000" },
    { code: "2.4", name: "Pavement & Surfacing", parentCode: "2.0", sortOrder: 24, color: "#f97316", textColor: "#ffffff" },
    { code: "2.4.1", name: "Base & Subbase", parentCode: "2.4", sortOrder: 241, color: "#fb923c", textColor: "#000000" },
    { code: "2.4.2", name: "Asphalt Paving", parentCode: "2.4", sortOrder: 242, color: "#fdba74", textColor: "#000000" },
    { code: "2.4.3", name: "Concrete Paving", parentCode: "2.4", sortOrder: 243, color: "#fed7aa", textColor: "#000000" },
    { code: "2.5", name: "Landscaping & Site Improvements", parentCode: "2.0", sortOrder: 25, color: "#8b5cf6", textColor: "#ffffff" },
    // Closeout
    { code: "3.0", name: "Closeout", parentCode: null, sortOrder: 30, color: "#14b8a6", textColor: "#ffffff" },
  ],
  activities: [
    // 1.0 Pre-Construction
    { activityId: "CIVIL1010", name: "Pre-Construction Meeting", duration: 1, wbs: "1.0" },
    { activityId: "CIVIL1020", name: "Submit Site Plans & Specs", duration: 3, wbs: "1.1.1" },
    { activityId: "CIVIL1030", name: "Plan Review & Approvals", duration: 14, wbs: "1.1.2" },
    { activityId: "CIVIL1040", name: "Mobilization & Site Setup", duration: 3, wbs: "1.0" },
    // 2.1 Demolition
    { activityId: "CIVIL2010", name: "Demolition & Removal", duration: 5, wbs: "2.1" },
    { activityId: "CIVIL2020", name: "Site Clearing & Vegetation Removal", duration: 4, wbs: "2.1" },
    // 2.2 Grading
    { activityId: "CIVIL3010", name: "Rough Grading", duration: 10, wbs: "2.2" },
    { activityId: "CIVIL3020", name: "Erosion Control", duration: 3, wbs: "2.2" },
    { activityId: "CIVIL3030", name: "Fine Grading", duration: 8, wbs: "2.2" },
    // 2.3 Utilities
    { activityId: "CIVIL4010", name: "Water Main Installation", duration: 8, wbs: "2.3.1" },
    { activityId: "CIVIL4020", name: "Sewer Installation", duration: 10, wbs: "2.3.1" },
    { activityId: "CIVIL4030", name: "Storm Drain Installation", duration: 12, wbs: "2.3.2" },
    { activityId: "CIVIL4040", name: "Gas Line Installation", duration: 6, wbs: "2.3.3" },
    { activityId: "CIVIL4050", name: "Electric Line Installation", duration: 7, wbs: "2.3.3" },
    { activityId: "CIVIL4060", name: "Telecommunications Installation", duration: 5, wbs: "2.3.4" },
    // 2.4 Pavement
    { activityId: "CIVIL5010", name: "Base & Subbase Preparation", duration: 6, wbs: "2.4.1" },
    { activityId: "CIVIL5020", name: "Asphalt Paving", duration: 8, wbs: "2.4.2" },
    { activityId: "CIVIL5030", name: "Concrete Paving", duration: 10, wbs: "2.4.3" },
    { activityId: "CIVIL5040", name: "Pavement Markings & Striping", duration: 3, wbs: "2.4" },
    // 2.5 Landscaping
    { activityId: "CIVIL6010", name: "Landscaping & Planting", duration: 8, wbs: "2.5" },
    { activityId: "CIVIL6020", name: "Irrigation System Installation", duration: 6, wbs: "2.5" },
    { activityId: "CIVIL6030", name: "Site Furnishings & Hardscape", duration: 5, wbs: "2.5" },
    // 3.0 Closeout
    { activityId: "CIVIL7010", name: "Final Inspections", duration: 2, wbs: "3.0" },
    { activityId: "CIVIL7020", name: "Punch List & Corrections", duration: 3, wbs: "3.0" },
    { activityId: "CIVIL7030", name: "Final Turnover", duration: 1, wbs: "3.0", activityType: "milestone" },
  ],
  relationships: [
    { pred: "CIVIL1010", succ: "CIVIL1020", type: "FS", lag: 0 },
    { pred: "CIVIL1020", succ: "CIVIL1030", type: "FS", lag: 0 },
    { pred: "CIVIL1030", succ: "CIVIL1040", type: "FS", lag: 0 },
    { pred: "CIVIL1040", succ: "CIVIL2010", type: "FS", lag: 0 },
    { pred: "CIVIL2010", succ: "CIVIL2020", type: "FS", lag: 0 },
    { pred: "CIVIL2020", succ: "CIVIL3010", type: "FS", lag: 0 },
    { pred: "CIVIL3010", succ: "CIVIL3020", type: "FS", lag: 0 },
    { pred: "CIVIL3020", succ: "CIVIL3030", type: "FS", lag: 0 },
    { pred: "CIVIL3030", succ: "CIVIL4010", type: "FS", lag: 0 },
    { pred: "CIVIL4010", succ: "CIVIL4020", type: "FS", lag: 0 },
    { pred: "CIVIL4020", succ: "CIVIL4030", type: "FS", lag: 0 },
    { pred: "CIVIL4030", succ: "CIVIL4040", type: "FS", lag: 0 },
    { pred: "CIVIL4040", succ: "CIVIL4050", type: "FS", lag: 0 },
    { pred: "CIVIL4050", succ: "CIVIL4060", type: "FS", lag: 0 },
    { pred: "CIVIL4060", succ: "CIVIL5010", type: "FS", lag: 0 },
    { pred: "CIVIL5010", succ: "CIVIL5020", type: "FS", lag: 0 },
    { pred: "CIVIL5020", succ: "CIVIL5030", type: "FS", lag: 0 },
    { pred: "CIVIL5030", succ: "CIVIL5040", type: "FS", lag: 0 },
    { pred: "CIVIL5040", succ: "CIVIL6010", type: "FS", lag: 0 },
    { pred: "CIVIL6010", succ: "CIVIL6020", type: "FS", lag: 0 },
    { pred: "CIVIL6020", succ: "CIVIL6030", type: "FS", lag: 0 },
    { pred: "CIVIL6030", succ: "CIVIL7010", type: "FS", lag: 0 },
    { pred: "CIVIL7010", succ: "CIVIL7020", type: "FS", lag: 0 },
    { pred: "CIVIL7020", succ: "CIVIL7030", type: "FS", lag: 0 },
  ],
  codeCategories: [
    { name: "Phase", values: ["Pre-Construction", "Demolition", "Grading", "Utilities", "Pavement", "Landscaping", "Closeout"] },
    { name: "Trade", values: ["Civil", "Excavation", "Utilities", "Paving", "Landscaping", "Drainage"] },
  ],
};
