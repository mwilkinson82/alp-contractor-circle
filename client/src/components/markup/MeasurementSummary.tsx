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

export function MeasurementSummary({
  elements,
  formatDistance,
  formatArea,
  isCalibrated,
  sheetName = "Sheet",
}: MeasurementSummaryProps) {
  const [expanded, setExpanded] = useState(false);

  const { lines, polygons, counts, totalLinePx, totalAreaPx } = useMemo(() => {
    const lines = elements.filter((e): e is LineShape => e.type === "line");
    const polygons = elements.filter((e): e is PolygonShape => e.type === "polygon");
    const counts = elements.filter((e): e is CountShape => e.type === "count");
    const totalLinePx = lines.reduce((sum, l) => sum + computeLineLength(l), 0);
    const totalAreaPx = polygons.reduce((sum, p) => sum + computePolygonArea(p), 0);
    return { lines, polygons, counts, totalLinePx, totalAreaPx };
  }, [elements]);

  const hasAny = lines.length > 0 || polygons.length > 0 || counts.length > 0;

  const fmtDist = (px: number) => (formatDistance ? formatDistance(px) : `${Math.round(px)}px`);
  const fmtArea = (px: number) => (formatArea ? formatArea(px) : `${Math.round(px)}px²`);

  const exportCSV = useCallback(() => {
    const rows: string[][] = [];
    rows.push(["Type", "Label", "Value", "Unit", "Color"]);

    // Lines
    lines.forEach((line, i) => {
      const val = fmtDist(computeLineLength(line));
      rows.push(["Line", `L${i + 1}`, val, isCalibrated ? "" : "px", line.color]);
    });
    if (lines.length > 0) {
      rows.push(["Line Total", "", fmtDist(totalLinePx), "", ""]);
    }

    // Polygons
    polygons.forEach((poly, i) => {
      const val = fmtArea(computePolygonArea(poly));
      rows.push(["Area", `A${i + 1}`, val, isCalibrated ? "" : "px²", poly.color]);
    });
    if (polygons.length > 0) {
      rows.push(["Area Total", "", fmtArea(totalAreaPx), "", ""]);
    }

    // Counts
    counts.forEach((c) => {
      rows.push(["Count", `#${c.number}`, String(c.number), "", c.color]);
    });
    if (counts.length > 0) {
      rows.push(["Count Total", "", String(counts.length), "items", ""]);
    }

    // Build CSV string
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
  }, [lines, polygons, counts, totalLinePx, totalAreaPx, fmtDist, fmtArea, isCalibrated, sheetName]);

  if (!hasAny) return null;

  return (
    <div className="absolute top-14 right-4 z-30 bg-black/80 backdrop-blur-sm rounded-lg border border-white/20 text-white text-xs max-w-[280px] shadow-lg">
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
              {counts.length} counted
            </span>
          )}
        </div>
      )}

      {/* Expanded detail */}
      {expanded && (
        <div className="px-3 pb-3 max-h-[300px] overflow-y-auto">
          {/* Lines section */}
          {lines.length > 0 && (
            <div className="mb-2">
              <div className="flex items-center gap-1 text-blue-300 font-semibold mb-1 text-[10px] uppercase tracking-wider">
                <Ruler size={10} />
                Lines ({lines.length})
              </div>
              {lines.map((line, i) => (
                <div key={line.id} className="flex justify-between py-0.5 border-b border-white/5">
                  <span className="text-white/70">L{i + 1}</span>
                  <span className="font-mono">{fmtDist(computeLineLength(line))}</span>
                </div>
              ))}
              <div className="flex justify-between pt-1 font-semibold text-blue-300">
                <span>Total</span>
                <span className="font-mono">{fmtDist(totalLinePx)}</span>
              </div>
            </div>
          )}

          {/* Polygons section */}
          {polygons.length > 0 && (
            <div className="mb-2">
              <div className="flex items-center gap-1 text-green-300 font-semibold mb-1 text-[10px] uppercase tracking-wider">
                <Pentagon size={10} />
                Areas ({polygons.length})
              </div>
              {polygons.map((poly, i) => (
                <div key={poly.id} className="flex justify-between py-0.5 border-b border-white/5">
                  <span className="text-white/70">A{i + 1}</span>
                  <span className="font-mono">{fmtArea(computePolygonArea(poly))}</span>
                </div>
              ))}
              <div className="flex justify-between pt-1 font-semibold text-green-300">
                <span>Total</span>
                <span className="font-mono">{fmtArea(totalAreaPx)}</span>
              </div>
            </div>
          )}

          {/* Counts section */}
          {counts.length > 0 && (
            <div className="mb-2">
              <div className="flex items-center gap-1 text-purple-300 font-semibold mb-1 text-[10px] uppercase tracking-wider">
                <Hash size={10} />
                Count ({counts.length})
              </div>
              <div className="flex justify-between pt-1 font-semibold text-purple-300">
                <span>Total items</span>
                <span className="font-mono">{counts.length}</span>
              </div>
            </div>
          )}

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
