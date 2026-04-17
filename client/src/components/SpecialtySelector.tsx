/**
 * SpecialtySelector — Lets users pick trade specialties grouped by CSI division.
 *
 * Shows only specialties for divisions that are currently selected.
 * Supports auto-detect mode where the system suggests specialties.
 */
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  TRADE_SPECIALTIES,
  getSpecialtiesByDivision,
  type TradeSpecialty,
} from "../../../shared/tradeSpecialties";
import { TAKEOFF_DIVISION_MAP } from "../../../shared/csiDivisions";
import { Wrench, Sparkles, Info } from "lucide-react";

interface SpecialtySelectorProps {
  /** Currently selected specialty IDs */
  value: string[];
  /** Callback when selection changes */
  onChange: (specialtyIds: string[]) => void;
  /** Currently selected CSI division codes — only show specialties for these */
  selectedDivisions: string[];
  /** AI-detected specialty IDs (shown with auto-detect badge) */
  detectedSpecialties?: string[];
}

export default function SpecialtySelector({
  value,
  onChange,
  selectedDivisions,
  detectedSpecialties = [],
}: SpecialtySelectorProps) {
  // Group specialties by division, filtered to selected divisions
  const groupedSpecialties = useMemo(() => {
    const allGrouped = getSpecialtiesByDivision();
    const filtered: Record<string, TradeSpecialty[]> = {};

    // If no divisions selected (= all), show all specialties
    const divsToShow =
      selectedDivisions.length === 0
        ? Object.keys(allGrouped)
        : selectedDivisions;

    for (const divCode of divsToShow) {
      if (allGrouped[divCode] && allGrouped[divCode].length > 0) {
        filtered[divCode] = allGrouped[divCode];
      }
    }
    return filtered;
  }, [selectedDivisions]);

  const totalAvailable = Object.values(groupedSpecialties).reduce(
    (sum, arr) => sum + arr.length,
    0
  );

  const toggleSpecialty = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  const selectAll = () => {
    const allIds = Object.values(groupedSpecialties)
      .flat()
      .map((s) => s.id);
    onChange(allIds);
  };

  const clearAll = () => {
    onChange([]);
  };

  if (totalAvailable === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Wrench className="w-8 h-8 text-cream-muted/40 mb-2" />
        <p className="text-sm text-cream-muted">
          No trade specialties available for the selected CSI divisions.
        </p>
        <p className="text-xs text-cream-muted/60 mt-1">
          Specialties are available for Divisions 03, 04, 05, 07, 08, 09, 21,
          23, 26, and 32.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header with count and actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-cream-muted">
            {value.length} of {totalAvailable} selected
          </span>
          {detectedSpecialties.length > 0 && (
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
              <Sparkles className="w-3 h-3 mr-1" />
              {detectedSpecialties.length} auto-detected
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={selectAll}
            className="text-[10px] text-amber-400 hover:text-amber-300 transition-colors"
          >
            Select All
          </button>
          <span className="text-cream-muted/30">|</span>
          <button
            onClick={clearAll}
            className="text-[10px] text-cream-muted hover:text-cream transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Info callout */}
      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/15">
        <Info className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-cream-muted leading-relaxed">
          Trade specialties tell the AI to generate additional line items a
          specialty contractor would include — items that may not be explicitly
          shown on the drawing but are essential for construction.
        </p>
      </div>

      {/* Scrollable specialty list */}
      <ScrollArea className="max-h-[300px]">
        <div className="space-y-4 pr-2">
          {Object.entries(groupedSpecialties)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([divCode, specialties]) => (
              <div key={divCode}>
                {/* Division header */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/80">
                    Div {divCode} — {TAKEOFF_DIVISION_MAP[divCode] || divCode}
                  </span>
                  <div className="flex-1 h-px bg-white/5" />
                </div>

                {/* Specialty checkboxes */}
                <div className="space-y-1.5 ml-1">
                  {specialties.map((spec) => {
                    const isSelected = value.includes(spec.id);
                    const isDetected = detectedSpecialties.includes(spec.id);

                    return (
                      <label
                        key={spec.id}
                        className={`flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-amber-500/10 border border-amber-500/25"
                            : "bg-white/[0.02] border border-transparent hover:bg-white/5"
                        }`}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSpecialty(spec.id)}
                          className="mt-0.5 border-white/20 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-cream">
                              {spec.name}
                            </span>
                            {spec.csiSubCode && (
                              <Badge className="bg-white/5 text-cream-muted/70 border-white/10 text-[9px] font-mono">
                                {spec.csiSubCode}
                              </Badge>
                            )}
                            {isDetected && (
                              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[9px]">
                                <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                                Auto-detected
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-cream-muted/70 mt-0.5 leading-relaxed">
                            {spec.description}
                          </p>
                          <p className="text-[10px] text-cream-muted/50 mt-1">
                            +{spec.additionalLineItems.length} specialty line
                            items
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      </ScrollArea>
    </div>
  );
}
