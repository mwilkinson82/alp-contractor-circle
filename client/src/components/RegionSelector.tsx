/**
 * RegionSelector — Cost region picker for Takeoff projects.
 *
 * Features:
 * - Grouped by geographic region (Northeast, Southeast, etc.)
 * - Shows multiplier for each metro area
 * - Search/filter functionality
 * - Clear display of selected region with multiplier
 */
import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { COST_REGION_GROUPS, type CostRegion } from "../../../shared/costRegions";
import {
  ChevronDown,
  ChevronUp,
  MapPin,
  Search,
  X,
} from "lucide-react";

interface RegionSelectorProps {
  value: string | null;
  onChange: (code: string | null) => void;
  /** Whether to start expanded */
  defaultExpanded?: boolean;
}

export default function RegionSelector({
  value,
  onChange,
  defaultExpanded = false,
}: RegionSelectorProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [search, setSearch] = useState("");

  // Find selected region details
  const selectedRegion = useMemo(() => {
    if (!value) return null;
    for (const group of COST_REGION_GROUPS) {
      const found = group.metros.find((m) => m.code === value);
      if (found) return found;
    }
    return null;
  }, [value]);

  // Filter regions by search
  const filteredGroups = useMemo(() => {
    if (!search.trim()) return COST_REGION_GROUPS;
    const q = search.toLowerCase();
    return COST_REGION_GROUPS.map((group) => ({
      ...group,
      metros: group.metros.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q) ||
          m.code.toLowerCase().includes(q) ||
          group.region.toLowerCase().includes(q)
      ),
    })).filter((g) => g.metros.length > 0);
  }, [search]);

  const getMultiplierColor = (multiplier: number) => {
    if (multiplier >= 12000) return "text-red-400";
    if (multiplier >= 10500) return "text-amber-400";
    if (multiplier >= 9500) return "text-cream";
    if (multiplier >= 9000) return "text-emerald-400";
    return "text-emerald-300";
  };

  return (
    <div className="space-y-2">
      {/* Header / Toggle */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 rounded-lg border border-white/10 bg-navy-medium/30 hover:bg-navy-medium/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-medium text-cream">Cost Region</span>
          {selectedRegion ? (
            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
              {selectedRegion.name} ({selectedRegion.displayMultiplier})
            </Badge>
          ) : (
            <Badge className="bg-white/5 text-cream-muted border-white/10 text-xs">
              National Average (1.00x)
            </Badge>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-cream-muted" />
        ) : (
          <ChevronDown className="w-4 h-4 text-cream-muted" />
        )}
      </button>

      {/* Expanded Panel */}
      {expanded && (
        <div className="border border-white/10 rounded-lg bg-navy-medium/20 overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-white/5">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cream-muted" />
              <Input
                placeholder="Search cities..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm bg-white/5 border-white/10"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-cream-muted hover:text-cream"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Region List */}
          <ScrollArea className="max-h-[320px]">
            <div className="p-2 space-y-3">
              {filteredGroups.map((group) => (
                <div key={group.region}>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-cream-muted/60 px-2 mb-1">
                    {group.region}
                  </div>
                  <div className="space-y-0.5">
                    {group.metros.map((metro) => {
                      const isSelected = value === metro.code;
                      return (
                        <button
                          key={metro.code}
                          type="button"
                          onClick={() => onChange(isSelected ? null : metro.code)}
                          className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-amber-500/15 border border-amber-500/30"
                              : "hover:bg-white/5 border border-transparent"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <MapPin className={`w-3 h-3 ${isSelected ? "text-amber-500" : "text-cream-muted/40"}`} />
                            <span className={`text-sm ${isSelected ? "text-cream font-medium" : "text-cream-muted"}`}>
                              {metro.name}
                            </span>
                          </div>
                          <span className={`text-xs font-mono font-medium ${getMultiplierColor(metro.multiplier)}`}>
                            {metro.displayMultiplier}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {filteredGroups.length === 0 && (
                <div className="text-center py-4 text-cream-muted text-sm">
                  No regions match "{search}"
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Info footer */}
          <div className="px-3 py-2 border-t border-white/5 text-[10px] text-cream-muted/50">
            Multipliers based on RSMeans City Cost Index data. National Average = 1.00x baseline.
          </div>
        </div>
      )}
    </div>
  );
}
