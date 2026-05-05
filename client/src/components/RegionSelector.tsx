/**
 * RegionSelector — Cost region picker for Takeoff projects.
 *
 * Features:
 * - Grouped by geographic region
 * - Filters regions by currency/country (USD→US, GBP→UK, AUD→AU)
 * - Shows multiplier for each metro area
 * - Search/filter functionality
 * - Clear display of selected region with multiplier
 */
import { useState, useMemo, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  COST_REGION_GROUPS,
  getRegionGroupsForCurrency,
  type CostRegion,
  type CostRegionGroup,
} from "../../../shared/costRegions";
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
  /** Currency code to filter regions by country (USD, GBP, AUD). Defaults to all. */
  currency?: string;
}

const SOURCE_LABELS: Record<string, string> = {
  US: "Multipliers based on RSMeans City Cost Index data. National Average = 1.00x baseline.",
  UK: "Multipliers based on BCIS Location Factor data (RICS). UK National Average = 1.00x baseline.",
  AU: "Multipliers based on Rawlinsons Construction Cost Guide. AU National Average = 1.00x baseline.",
};

const CURRENCY_TO_COUNTRY: Record<string, string> = {
  USD: "US",
  GBP: "UK",
  AUD: "AU",
};

export default function RegionSelector({
  value,
  onChange,
  defaultExpanded = false,
  currency,
}: RegionSelectorProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [search, setSearch] = useState("");

  // Get the region groups filtered by currency
  const regionGroups = useMemo(() => {
    if (!currency) return COST_REGION_GROUPS;
    return getRegionGroupsForCurrency(currency);
  }, [currency]);

  // When currency changes, reset selection if current region doesn't belong to the new country
  useEffect(() => {
    if (!value || !currency) return;
    const country = CURRENCY_TO_COUNTRY[currency];
    if (!country) return;
    const allCodes = regionGroups.flatMap((g) => g.metros.map((m) => m.code));
    if (!allCodes.includes(value)) {
      onChange(null); // Reset to national average for new country
    }
  }, [currency, regionGroups]);

  // Find selected region details
  const selectedRegion = useMemo(() => {
    if (!value) return null;
    for (const group of regionGroups) {
      const found = group.metros.find((m) => m.code === value);
      if (found) return found;
    }
    return null;
  }, [value, regionGroups]);

  // Filter regions by search
  const filteredGroups = useMemo(() => {
    if (!search.trim()) return regionGroups;
    const q = search.toLowerCase();
    return regionGroups
      .map((group) => ({
        ...group,
        metros: group.metros.filter(
          (m) =>
            m.name.toLowerCase().includes(q) ||
            m.description.toLowerCase().includes(q) ||
            m.code.toLowerCase().includes(q) ||
            group.region.toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.metros.length > 0);
  }, [search, regionGroups]);

  // Footer source label
  const country = currency ? CURRENCY_TO_COUNTRY[currency] : "US";
  const sourceLabel = SOURCE_LABELS[country || "US"] || SOURCE_LABELS.US;

  const getMultiplierColor = (multiplier: number) => {
    if (multiplier >= 12000) return "text-orange-700";
    if (multiplier >= 10500) return "text-[#a66d00]";
    if (multiplier >= 9500) return "text-[#29251c]";
    return "text-emerald-700";
  };

  return (
    <div className="space-y-2">
      {/* Header / Toggle */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 rounded-lg border border-[#d7c7aa] bg-white/75 hover:bg-white transition-colors"
      >
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-emerald-700" />
          <span className="text-sm font-medium text-[#171714]">Cost Region</span>
          {selectedRegion ? (
            <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 text-xs">
              {selectedRegion.name} ({selectedRegion.displayMultiplier})
            </Badge>
          ) : (
            <Badge className="bg-white text-[#716855] border-[#d7c7aa] text-xs">
              National Average (1.00x)
            </Badge>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-[#716855]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#716855]" />
        )}
      </button>

      {/* Expanded Panel */}
      {expanded && (
        <div className="border border-[#d7c7aa] rounded-lg bg-white/70 overflow-hidden shadow-sm">
          {/* Search */}
          <div className="p-2 border-b border-[#eadcc4]">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#716855]" />
              <Input
                placeholder="Search cities..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm bg-white border-[#d7c7aa] text-[#171714] placeholder:text-[#8a806d]"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#716855] hover:text-[#171714]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Region List */}
          <div className="max-h-[320px] overflow-y-auto overscroll-contain">
            <div className="p-2 space-y-3">
              {filteredGroups.map((group) => (
                <div key={group.region}>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-[#8a806d] px-2 mb-1">
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
                              ? "border border-[#d7b44d] bg-[#fff4cb]"
                              : "hover:bg-[#faf8f2] border border-transparent"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <MapPin className={`w-3 h-3 ${isSelected ? "text-emerald-700" : "text-[#8a806d]"}`} />
                            <span className={`text-sm ${isSelected ? "text-[#171714] font-medium" : "text-[#716855]"}`}>
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
                <div className="text-center py-4 text-[#716855] text-sm">
                  No regions match "{search}"
                </div>
              )}
            </div>
          </div>

          {/* Info footer */}
          <div className="px-3 py-2 border-t border-[#eadcc4] text-[10px] text-[#716855]">
            {sourceLabel}
          </div>
        </div>
      )}
    </div>
  );
}
