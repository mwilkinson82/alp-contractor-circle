import { CUSTOM_RESIDENTIAL_ALLOWANCE_PRESETS } from "./residentialEstimateQa";

export type TakeoffProjectType = "commercial" | "residential" | "civil_sitework" | "other";

export interface ProjectTypeOption {
  value: TakeoffProjectType;
  label: string;
  description: string;
}

export interface AllowancePreset {
  label: string;
  amount: number;
}

export const DEFAULT_TAKEOFF_PROJECT_TYPE: TakeoffProjectType = "commercial";

export const TAKEOFF_PROJECT_TYPE_OPTIONS: ProjectTypeOption[] = [
  {
    value: "commercial",
    label: "Commercial",
    description: "Retail, office, industrial, hospitality, healthcare, and similar building projects.",
  },
  {
    value: "residential",
    label: "Residential",
    description: "Custom homes, renovations, multi-family, and owner-selection-heavy residential work.",
  },
  {
    value: "civil_sitework",
    label: "Civil / Sitework",
    description: "Earthwork, utilities, paving, drainage, public works, and site packages.",
  },
  {
    value: "other",
    label: "Other / Not sure",
    description: "Use when the project type is mixed or unclear.",
  },
];

export const COMMERCIAL_ALLOWANCE_PRESETS: AllowancePreset[] = [
  { label: "FF&E (Furniture, Fixtures & Equipment)", amount: 2500000 },
  { label: "Signage & Wayfinding", amount: 800000 },
  { label: "Security Systems", amount: 1500000 },
  { label: "Low-Voltage / Data & Communications", amount: 2000000 },
  { label: "Specialty Equipment", amount: 3000000 },
  { label: "AV Systems", amount: 1200000 },
];

export const CIVIL_SITEWORK_ALLOWANCE_PRESETS: AllowancePreset[] = [
  { label: "Traffic Control & MOT", amount: 1500000 },
  { label: "Environmental Compliance", amount: 1000000 },
  { label: "Temporary Facilities", amount: 800000 },
  { label: "Erosion & Sediment Control", amount: 600000 },
  { label: "Dewatering", amount: 1200000 },
  { label: "Testing & Inspection", amount: 1000000 },
];

const RESIDENTIAL_ALLOWANCE_PRESETS: AllowancePreset[] = CUSTOM_RESIDENTIAL_ALLOWANCE_PRESETS.map((preset) => ({
  label: preset.description,
  amount: preset.amount,
}));

export function normalizeTakeoffProjectType(value?: string | null): TakeoffProjectType {
  if (value === "residential" || value === "civil_sitework" || value === "other") return value;
  return DEFAULT_TAKEOFF_PROJECT_TYPE;
}

export function getTakeoffProjectTypeLabel(value?: string | null): string {
  const projectType = normalizeTakeoffProjectType(value);
  return TAKEOFF_PROJECT_TYPE_OPTIONS.find((option) => option.value === projectType)?.label || "Commercial";
}

export function shouldRunResidentialQa(projectType?: string | null): boolean {
  return normalizeTakeoffProjectType(projectType) === "residential";
}

export function getAllowancePresetsForProjectType(projectType?: string | null): AllowancePreset[] {
  switch (normalizeTakeoffProjectType(projectType)) {
    case "residential":
      return RESIDENTIAL_ALLOWANCE_PRESETS;
    case "civil_sitework":
      return CIVIL_SITEWORK_ALLOWANCE_PRESETS;
    case "commercial":
      return COMMERCIAL_ALLOWANCE_PRESETS;
    case "other":
      return [];
  }
}
