/**
 * DivisionSelector — CSI MasterFormat Division picker for Takeoff projects.
 *
 * Features:
 * - Quick presets (GC Full, Concrete Sub, MEP Package, etc.)
 * - Individual division toggle with checkboxes
 * - Group headers for visual organization
 * - "Select All / Clear All" controls
 * - Compact badge summary when collapsed
 */
import { useState, useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  TAKEOFF_DIVISIONS,
  ALL_TAKEOFF_DIVISION_CODES,
  DIVISION_PRESETS,
  type CsiDivision,
} from "../../../shared/csiDivisions";
import {
  ChevronDown,
  ChevronUp,
  Layers,
  CheckSquare,
  Square,
  Zap,
} from "lucide-react";

interface DivisionSelectorProps {
  value: string[];
  onChange: (codes: string[]) => void;
  /** Whether to start expanded */
  defaultExpanded?: boolean;
}

/** Group divisions by their CsiGroup for visual organization */
const DIVISION_GROUPS: { label: string; divisions: CsiDivision[] }[] = [
  { label: "General & Site", divisions: TAKEOFF_DIVISIONS.filter((d) => ["01", "02"].includes(d.code)) },
  { label: "Structure", divisions: TAKEOFF_DIVISIONS.filter((d) => ["03", "04", "05", "06"].includes(d.code)) },
  { label: "Envelope & Finishes", divisions: TAKEOFF_DIVISIONS.filter((d) => ["07", "08", "09", "10", "11", "12", "13", "14"].includes(d.code)) },
  { label: "Mechanical / Plumbing / Fire", divisions: TAKEOFF_DIVISIONS.filter((d) => ["21", "22", "23", "25"].includes(d.code)) },
  { label: "Electrical / Low Voltage", divisions: TAKEOFF_DIVISIONS.filter((d) => ["26", "27", "28"].includes(d.code)) },
  { label: "Sitework & Utilities", divisions: TAKEOFF_DIVISIONS.filter((d) => ["31", "32", "33", "34", "35"].includes(d.code)) },
].filter((g) => g.divisions.length > 0);

export default function DivisionSelector({
  value,
  onChange,
  defaultExpanded = false,
}: DivisionSelectorProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [showPresets, setShowPresets] = useState(true);

  const allSelected = value.length === 0 || value.length === ALL_TAKEOFF_DIVISION_CODES.length;
  const selectedSet = useMemo(() => new Set(value), [value]);

  const toggleDivision = (code: string) => {
    if (allSelected) {
      // Switching from "all" to specific: select all except this one
      onChange(ALL_TAKEOFF_DIVISION_CODES.filter((c) => c !== code));
    } else if (selectedSet.has(code)) {
      const next = value.filter((c) => c !== code);
      // If removing the last one, revert to all
      onChange(next.length === 0 ? [] : next);
    } else {
      const next = [...value, code];
      // If selecting all, revert to empty (meaning all)
      onChange(next.length >= ALL_TAKEOFF_DIVISION_CODES.length ? [] : next);
    }
  };

  const selectAll = () => onChange([]);
  const clearAll = () => onChange(["03"]); // Default to at least one division

  const applyPreset = (codes: string[]) => {
    if (codes.length === ALL_TAKEOFF_DIVISION_CODES.length) {
      onChange([]);
    } else {
      onChange(codes);
    }
  };

  const isDivisionSelected = (code: string) => allSelected || selectedSet.has(code);

  // Summary text
  const summaryText = allSelected
    ? "All Divisions (Full GC Takeoff)"
    : value.length === 1
      ? `Division ${value[0]} — ${TAKEOFF_DIVISIONS.find((d) => d.code === value[0])?.name || "Unknown"}`
      : `${value.length} divisions selected`;

  // Find matching preset
  const matchingPreset = useMemo(() => {
    if (allSelected) return "All Divisions";
    const sorted = [...value].sort();
    return DIVISION_PRESETS.find((p) => {
      const pSorted = [...p.codes].sort();
      return pSorted.length === sorted.length && pSorted.every((c, i) => c === sorted[i]);
    })?.label || null;
  }, [value, allSelected]);

  return (
    <div className="space-y-2">
      {/* Header / Toggle */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 rounded-lg border border-[#d7c7aa] bg-white/75 hover:bg-white transition-colors"
      >
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#8a6510]" />
          <span className="text-sm font-medium text-[#171714]">CSI Divisions</span>
          {matchingPreset && (
            <Badge className="bg-[#fff4cb] text-[#8a6510] border-[#d7b44d] text-xs">
              {matchingPreset}
            </Badge>
          )}
          {!matchingPreset && !allSelected && (
            <Badge className="bg-blue-50 text-[#244c91] border-blue-200 text-xs">
              {value.length} selected
            </Badge>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-[#716855]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#716855]" />
        )}
      </button>

      {/* Collapsed summary badges */}
      {!expanded && !allSelected && value.length > 0 && (
        <div className="flex flex-wrap gap-1 px-1">
          {value.slice(0, 8).map((code) => (
            <Badge
              key={code}
              className="bg-white text-[#716855] border-[#d7c7aa] text-xs"
            >
              {code} — {TAKEOFF_DIVISIONS.find((d) => d.code === code)?.name || code}
            </Badge>
          ))}
          {value.length > 8 && (
            <Badge className="bg-white text-[#716855] border-[#d7c7aa] text-xs">
              +{value.length - 8} more
            </Badge>
          )}
        </div>
      )}

      {/* Expanded Panel */}
      {expanded && (
        <div className="border border-[#d7c7aa] rounded-lg bg-white/70 overflow-hidden shadow-sm">
          {/* Quick Presets */}
          {showPresets && (
            <div className="p-3 border-b border-[#eadcc4]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[#716855] flex items-center gap-1">
                  <Zap className="w-3 h-3 text-[#8a6510]" />
                  Quick Presets
                </span>
                <button
                  type="button"
                  onClick={() => setShowPresets(false)}
                  className="text-xs text-[#716855] hover:text-[#171714]"
                >
                  Hide
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {DIVISION_PRESETS.map((preset) => {
                  const isActive =
                    (preset.codes.length === ALL_TAKEOFF_DIVISION_CODES.length && allSelected) ||
                    (!allSelected &&
                      preset.codes.length === value.length &&
                      [...preset.codes].sort().every((c, i) => [...value].sort()[i] === c));
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => applyPreset(preset.codes)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                        isActive
                          ? "bg-[#fff4cb] text-[#8a6510] border border-[#d7b44d]"
                          : "bg-white text-[#716855] border border-[#d7c7aa] hover:bg-[#faf8f2] hover:text-[#171714]"
                      }`}
                      title={preset.description}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#eadcc4]">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-[#716855] hover:bg-[#faf8f2] hover:text-[#171714]"
                onClick={selectAll}
              >
                <CheckSquare className="w-3 h-3 mr-1" />
                Select All
              </Button>
              {!showPresets && (
                <button
                  type="button"
                  onClick={() => setShowPresets(true)}
                  className="text-xs text-[#8a6510] hover:text-[#6f4d00]"
                >
                  Show Presets
                </button>
              )}
            </div>
            <span className="text-xs text-[#716855]">
              {allSelected ? ALL_TAKEOFF_DIVISION_CODES.length : value.length} of {ALL_TAKEOFF_DIVISION_CODES.length}
            </span>
          </div>

          {/* Division List — scrollable */}
          <div className="max-h-[400px] overflow-y-auto overscroll-contain">
            <div className="p-2 space-y-3">
              {DIVISION_GROUPS.map((group) => (
                <div key={group.label}>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-[#8a806d] px-2 mb-1">
                    {group.label}
                  </div>
                  <div className="space-y-0.5">
                    {group.divisions.map((div) => {
                      const selected = isDivisionSelected(div.code);
                      return (
                        <label
                          key={div.code}
                          className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
                            selected
                              ? "bg-[#fff4cb] hover:bg-[#fff0b8]"
                              : "hover:bg-[#faf8f2]"
                          }`}
                        >
                          <Checkbox
                            checked={selected}
                            onCheckedChange={() => toggleDivision(div.code)}
                            className="border-[#c8b895] data-[state=checked]:bg-[#d9a21a] data-[state=checked]:border-[#d9a21a]"
                          />
                          <span className="text-xs font-mono text-[#8a6510] w-5">
                            {div.code}
                          </span>
                          <span className={`text-sm ${selected ? "text-[#171714]" : "text-[#716855]"}`}>
                            {div.name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
