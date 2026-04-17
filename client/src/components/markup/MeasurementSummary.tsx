import { useState, useMemo, useCallback } from "react";
import { ChevronDown, ChevronUp, Ruler, Pentagon, Sigma, Hash, FileSpreadsheet } from "lucide-react";
import type { Shape, LineShape, PolygonShape, CountShape } from "./types";

interface MeasurementSummaryProps {
  elements: Shape[];
  /** Converts pixel distance to formatted string (e.g. "12.5 ft") */
  formatDistance?: (pxDist: number) => string;
  /** Converts pixel² area to formatted string (e.g. "150.2 SF") */
  formatArea?: (pxArea: number) => string;
  /** Whether scale is calibrated */
  isCalibrated: boolean;
  /** Sheet name for CSV export */
  sheetName?: string;
}

function computeLineLength(line: LineShape): number {
  const dx = line.end.x - line.start.x;
  const dy = line.end.y - line.start.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function computePolygonArea(poly: PolygonShape): number {
  const pts = poly.points;
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    area += pts[i].x * pts[j].y;
    area -= pts[j].x * pts[i].y;
  }
  return Math.abs(area) / 2;
}

/** Friendly color name for display */
function colorName(hex: string): string {
  const map: Record<string, string> = {
    "#EF4444": "Red",
    "#ef4444": "Red",
    "#F97316": "Orange",
    "#f97316": "Orange",
    "#EAB308": "Yellow",
    "#eab308": "Yellow",
    "#22C55E": "Green",
    "#22c55e": "Green",
    "#3B82F6": "Blue",
    "#3b82f6": "Blue",
    "#8B5CF6": "Purple",
    "#8b5cf6": "Purple",
    "#EC4899": "Pink",
    "#ec4899": "Pink",
    "#FFFFFF": "White",
    "#ffffff": "White",
    "#000000": "Black",
  };
  return map[hex] || hex;
}

interface ColorGroup {
  color: string;
  lines: LineShape[];
  polygons: PolygonShape[];
  counts: CountShape[];
}

export function MeasurementSummary({
  elements,
  formatDistance,
  formatArea,
  isCalibrated,
  sheetName = "Sheet",
}: MeasurementSummaryProps) {
  const [expanded, setExpanded] = useState(false);

  const { lines, polygons, counts, totalLinePx, totalAreaPx, colorGroups, countsByLabel } = useMemo(() => {
    const lines = elements.filter((e): e is LineShape => e.type === "line");
    const polygons = elements.filter((e): e is PolygonShape => e.type === "polygon");
    const counts = elements.filter((e): e is CountShape => e.type === "count");
    const totalLinePx = lines.reduce((sum, l) => sum + computeLineLength(l), 0);
    const totalAreaPx = polygons.reduce((sum, p) => sum + computePolygonArea(p), 0);

    // Group by color
    const colorMap = new Map<string, ColorGroup>();
    for (const line of lines) {
      const g = colorMap.get(line.color) || { color: line.color, lines: [], polygons: [], counts: [] };
      g.lines.push(line);
      colorMap.set(line.color, g);
    }
    for (const poly of polygons) {
      const g = colorMap.get(poly.color) || { color: poly.color, lines: [], polygons: [], counts: [] };
      g.polygons.push(poly);
      colorMap.set(poly.color, g);
    }
    for (const c of counts) {
      const g = colorMap.get(c.color) || { color: c.color, lines: [], polygons: [], counts: [] };
      g.counts.push(c);
      colorMap.set(c.color, g);
    }
    const colorGroups = Array.from(colorMap.values());

    // Group counts by label
    const labelMap = new Map<string, CountShape[]>();
    for (const c of counts) {
      const key = c.label || "(unlabeled)";
      const arr = labelMap.get(key) || [];
      arr.push(c);
      labelMap.set(key, arr);
    }
    const countsByLabel = Array.from(labelMap.entries()).map(([label, items]) => ({ label, count: items.length, color: items[0].color }));

    return { lines, polygons, counts, totalLinePx, totalAreaPx, colorGroups, countsByLabel };
  }, [elements]);

  const hasAny = lines.length > 0 || polygons.length > 0 || counts.length > 0;

  const fmtDist = (px: number) => (formatDistance ? formatDistance(px) : `${Math.round(px)}px`);
  const fmtArea = (px: number) => (formatArea ? formatArea(px) : `${Math.round(px)}px²`);

  const exportCSV = useCallback(() => {
    const rows: string[][] = [];
    rows.push(["Type", "Label", "Category", "Value", "Unit", "Color"]);

    // Group by color
    for (const group of colorGroups) {
      const cName = colorName(group.color);

      // Lines in this color
      group.lines.forEach((line, i) => {
        const val = fmtDist(computeLineLength(line));
        rows.push(["Line", `L${i + 1}`, "", val, isCalibrated ? "" : "px", cName]);
      });
      if (group.lines.length > 0) {
        const groupTotal = group.lines.reduce((s, l) => s + computeLineLength(l), 0);
        rows.push(["Line Subtotal", "", "", fmtDist(groupTotal), "", cName]);
      }

      // Polygons in this color
      group.polygons.forEach((poly, i) => {
        const val = fmtArea(computePolygonArea(poly));
        rows.push(["Area", `A${i + 1}`, "", val, isCalibrated ? "" : "px²", cName]);
      });
      if (group.polygons.length > 0) {
        const groupTotal = group.polygons.reduce((s, p) => s + computePolygonArea(p), 0);
        rows.push(["Area Subtotal", "", "", fmtArea(groupTotal), "", cName]);
      }

      // Counts in this color — grouped by label
      const labelMap = new Map<string, CountShape[]>();
      for (const c of group.counts) {
        const key = c.label || "(unlabeled)";
        const arr = labelMap.get(key) || [];
        arr.push(c);
        labelMap.set(key, arr);
      }
      for (const [label, items] of Array.from(labelMap.entries())) {
        rows.push(["Count", `${items.length}x`, label, String(items.length), "items", cName]);
      }
    }

    // Grand totals
    rows.push([]);
    if (lines.length > 0) rows.push(["TOTAL Lines", "", "", fmtDist(totalLinePx), "", ""]);
    if (polygons.length > 0) rows.push(["TOTAL Areas", "", "", fmtArea(totalAreaPx), "", ""]);
    if (counts.length > 0) rows.push(["TOTAL Count", "", "", String(counts.length), "items", ""]);

    const csvContent = rows
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${sheetName.replace(/[^a-zA-Z0-9_-]/g, "_")}_measurements.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [colorGroups, lines, polygons, counts, totalLinePx, totalAreaPx, fmtDist, fmtArea, isCalibrated, sheetName]);

  if (!hasAny) return null;

  return (
    <div className="bg-black/80 backdrop-blur-sm rounded-lg border border-white/20 text-white text-xs max-w-[300px] shadow-lg">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full px-3 py-2 hover:bg-white/10 rounded-lg transition-colors"
      >
        <Sigma size={14} className="text-amber-400 shrink-0" />
        <span className="font-semibold text-[11px] uppercase tracking-wide">Measurements</span>
        <span className="ml-auto text-[10px] text-white/60">
          {lines.length > 0 && `${lines.length}L`}
          {lines.length > 0 && (polygons.length > 0 || counts.length > 0) && " · "}
          {polygons.length > 0 && `${polygons.length}A`}
          {polygons.length > 0 && counts.length > 0 && " · "}
          {counts.length > 0 && `${counts.length}C`}
        </span>
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {/* Collapsed summary */}
      {!expanded && (
        <div className="px-3 pb-2 flex gap-3 text-[11px] flex-wrap">
          {lines.length > 0 && (
            <span className="flex items-center gap-1 text-blue-300">
              <Ruler size={10} />
              {isCalibrated ? fmtDist(totalLinePx) : `${lines.length} lines`}
            </span>
          )}
          {polygons.length > 0 && (
            <span className="flex items-center gap-1 text-green-300">
              <Pentagon size={10} />
              {isCalibrated ? fmtArea(totalAreaPx) : `${polygons.length} areas`}
            </span>
          )}
          {counts.length > 0 && (
            <span className="flex items-center gap-1 text-purple-300">
              <Hash size={10} />
              {countsByLabel.length === 1 && countsByLabel[0].label !== "(unlabeled)"
                ? `${counts.length} ${countsByLabel[0].label}`
                : `${counts.length} counted`}
            </span>
          )}
        </div>
      )}

      {/* Expanded detail — grouped by color */}
      {expanded && (
        <div className="px-3 pb-3 max-h-[350px] overflow-y-auto">
          {colorGroups.map((group) => {
            const hasLines = group.lines.length > 0;
            const hasPolygons = group.polygons.length > 0;
            const hasCounts = group.counts.length > 0;
            const groupLinePx = group.lines.reduce((s, l) => s + computeLineLength(l), 0);
            const groupAreaPx = group.polygons.reduce((s, p) => s + computePolygonArea(p), 0);

            // Group counts by label within this color
            const labelMap = new Map<string, number>();
            for (const c of group.counts) {
              const key = c.label || "(unlabeled)";
              labelMap.set(key, (labelMap.get(key) || 0) + 1);
            }

            return (
              <div key={group.color} className="mb-2.5 last:mb-0">
                {/* Color header */}
                <div className="flex items-center gap-1.5 mb-1 pb-0.5 border-b border-white/10">
                  <div
                    className="w-3 h-3 rounded-full border border-white/30 shrink-0"
                    style={{ backgroundColor: group.color }}
                  />
                  <span className="font-semibold text-[10px] uppercase tracking-wider text-white/80">
                    {colorName(group.color)}
                  </span>
                </div>

                {/* Lines in this color */}
                {hasLines && (
                  <div className="ml-4 mb-1">
                    <div className="flex items-center gap-1 text-blue-300 text-[10px] font-medium mb-0.5">
                      <Ruler size={9} />
                      Lines ({group.lines.length})
                    </div>
                    {group.lines.map((line, i) => (
                      <div key={line.id} className="flex justify-between py-0.5 text-[10px]">
                        <span className="text-white/60">L{i + 1}</span>
                        <span className="font-mono text-white/90">{fmtDist(computeLineLength(line))}</span>
                      </div>
                    ))}
                    {group.lines.length > 1 && (
                      <div className="flex justify-between pt-0.5 text-[10px] font-semibold text-blue-300">
                        <span>Subtotal</span>
                        <span className="font-mono">{fmtDist(groupLinePx)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Polygons in this color */}
                {hasPolygons && (
                  <div className="ml-4 mb-1">
                    <div className="flex items-center gap-1 text-green-300 text-[10px] font-medium mb-0.5">
                      <Pentagon size={9} />
                      Areas ({group.polygons.length})
                    </div>
                    {group.polygons.map((poly, i) => (
                      <div key={poly.id} className="flex justify-between py-0.5 text-[10px]">
                        <span className="text-white/60">A{i + 1}</span>
                        <span className="font-mono text-white/90">{fmtArea(computePolygonArea(poly))}</span>
                      </div>
                    ))}
                    {group.polygons.length > 1 && (
                      <div className="flex justify-between pt-0.5 text-[10px] font-semibold text-green-300">
                        <span>Subtotal</span>
                        <span className="font-mono">{fmtArea(groupAreaPx)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Counts in this color — grouped by label */}
                {hasCounts && (
                  <div className="ml-4 mb-1">
                    <div className="flex items-center gap-1 text-purple-300 text-[10px] font-medium mb-0.5">
                      <Hash size={9} />
                      Count ({group.counts.length})
                    </div>
                    {Array.from(labelMap.entries()).map(([label, count]) => (
                      <div key={label} className="flex justify-between py-0.5 text-[10px]">
                        <span className="text-white/60">{label}</span>
                        <span className="font-mono text-white/90">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Grand totals */}
          <div className="mt-2 pt-2 border-t border-white/20">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 mb-1">Totals</div>
            {lines.length > 0 && (
              <div className="flex justify-between py-0.5 text-[11px]">
                <span className="flex items-center gap-1 text-blue-300">
                  <Ruler size={10} /> All Lines
                </span>
                <span className="font-mono font-semibold">{fmtDist(totalLinePx)}</span>
              </div>
            )}
            {polygons.length > 0 && (
              <div className="flex justify-between py-0.5 text-[11px]">
                <span className="flex items-center gap-1 text-green-300">
                  <Pentagon size={10} /> All Areas
                </span>
                <span className="font-mono font-semibold">{fmtArea(totalAreaPx)}</span>
              </div>
            )}
            {counts.length > 0 && (
              <div className="flex justify-between py-0.5 text-[11px]">
                <span className="flex items-center gap-1 text-purple-300">
                  <Hash size={10} /> All Counts
                </span>
                <span className="font-mono font-semibold">{counts.length}</span>
              </div>
            )}
            {/* Count breakdown by label in totals */}
            {countsByLabel.length > 1 && (
              <div className="ml-5 mt-0.5">
                {countsByLabel.map(({ label, count, color }) => (
                  <div key={label} className="flex justify-between py-0.5 text-[10px] text-white/60">
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      {label}
                    </span>
                    <span className="font-mono">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!isCalibrated && (
            <p className="text-amber-400/80 text-[10px] mt-1 italic">
              Calibrate scale for real-world units
            </p>
          )}

          {/* Export CSV button */}
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 w-full mt-2 px-2 py-1.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 transition-colors text-[11px] font-medium justify-center"
          >
            <FileSpreadsheet size={12} />
            Export to CSV
          </button>
        </div>
      )}
    </div>
  );
}
