import { describe, expect, it } from "vitest";
import {
  getAllowancePresetsForProjectType,
  normalizeTakeoffProjectType,
  shouldRunResidentialQa,
} from "../shared/projectType";

describe("takeoff project type", () => {
  it("does not run Residential QA for commercial projects", () => {
    expect(shouldRunResidentialQa("commercial")).toBe(false);
  });

  it("runs Residential QA for residential projects", () => {
    expect(shouldRunResidentialQa("residential")).toBe(true);
  });

  it("defaults missing projectType to commercial", () => {
    expect(normalizeTakeoffProjectType(null)).toBe("commercial");
    expect(normalizeTakeoffProjectType(undefined)).toBe("commercial");
    expect(normalizeTakeoffProjectType("unknown")).toBe("commercial");
  });

  it("filters allowance presets by projectType", () => {
    expect(getAllowancePresetsForProjectType("residential").some((preset) => preset.label.includes("Kitchen cabinets"))).toBe(true);
    expect(getAllowancePresetsForProjectType("commercial").some((preset) => preset.label.includes("FF&E"))).toBe(true);
    expect(getAllowancePresetsForProjectType("civil_sitework").some((preset) => preset.label.includes("Traffic Control"))).toBe(true);
    expect(getAllowancePresetsForProjectType("other")).toEqual([]);
  });
});
