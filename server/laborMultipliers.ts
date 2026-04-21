/**
 * Labor Multiplier Map by CSI Division
 * 
 * Converts material-only costs to installed costs (labor + material + overhead)
 * Based on contractor actuals from Kramer Residence project
 * 
 * Multiplier = (Material + Labor + Overhead) / Material
 */

export const LABOR_MULTIPLIERS: Record<string, number> = {
  // 01 — General Requirements (design, permits, survey)
  "01": 1.0,  // no labor multiplier (already includes fees)
  
  // 02 — Existing Conditions (demolition, site prep)
  "02": 2.5,  // demolition + labor
  
  // 03 — Concrete (slabs, footings, walls)
  "03": 3.5,  // concrete material + labor (forming, pouring, finishing, curing)
  
  // 04 — Masonry (CMU, brick, stone)
  "04": 3.0,  // masonry units + mortar + labor
  
  // 05 — Metals (structural steel, misc metal)
  "05": 2.5,  // steel + fabrication + installation labor
  
  // 06 — Wood, Plastics & Composites (framing, lumber, trusses)
  "06": 2.8,  // lumber + framing labor + assembly
  
  // 07 — Thermal & Moisture Protection (insulation, roofing, waterproofing)
  "07": 3.0,  // materials + installation labor
  
  // 08 — Openings (windows, doors, frames, hardware)
  "08": 2.2,  // window/door units + installation labor (mostly material cost)
  
  // 09 — Finishes (drywall, paint, flooring, tile)
  "09": 4.0,  // drywall + taping + paint + flooring + tile (high labor component)
  
  // 10 — Specialties (toilet partitions, lockers, etc.)
  "10": 2.5,
  
  // 11 — Equipment (appliances, built-ins)
  "11": 1.5,  // mostly material cost, minimal installation
  
  // 12 — Furnishings (cabinets, counters, millwork)
  "12": 2.0,  // cabinet/counter material + installation
  
  // 14 — Conveying Equipment (elevators, lifts)
  "14": 1.3,  // mostly equipment cost, installation labor minimal
  
  // 21 — Fire Suppression
  "21": 2.5,
  
  // 22 — Plumbing (fixtures, rough-in, trim)
  "22": 2.8,  // fixtures + rough-in labor + trim labor
  
  // 23 — HVAC (equipment, ductwork, installation)
  "23": 2.5,  // equipment + ductwork + installation labor
  
  // 25 — Integrated Automation
  "25": 2.0,
  
  // 26 — Electrical (rough-in, fixtures, panels)
  "26": 2.8,  // wire/conduit + rough-in labor + fixture installation
  
  // 27 — Communications
  "27": 2.5,
  
  // 28 — Electronic Safety (security, alarms, fire detection)
  "28": 2.5,
  
  // 31 — Earthwork (excavation, grading, fill)
  "31": 2.0,  // equipment rental + operator + material
  
  // 32 — Exterior Improvements (landscaping, paving, irrigation)
  "32": 2.5,  // materials + labor
  
  // 33 — Utilities (site utilities, underground)
  "33": 2.5,
  
  // Default for unknown divisions
  "default": 2.5,
};

/**
 * Get labor multiplier for a CSI division
 */
export function getLaborMultiplier(csiDivision: string): number {
  if (!csiDivision) return LABOR_MULTIPLIERS.default;
  
  // Extract division number (e.g., "03" from "03 — Concrete")
  const divisionMatch = csiDivision.match(/^(\d+)/);
  if (!divisionMatch) return LABOR_MULTIPLIERS.default;
  
  const divisionCode = divisionMatch[1];
  return LABOR_MULTIPLIERS[divisionCode] || LABOR_MULTIPLIERS.default;
}

/**
 * Apply labor multiplier to material cost
 */
export function applyLaborMultiplier(materialCost: number, csiDivision: string): number {
  const multiplier = getLaborMultiplier(csiDivision);
  return materialCost * multiplier;
}
