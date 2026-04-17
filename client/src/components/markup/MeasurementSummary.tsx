import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, Ruler, Pentagon, Sigma } from "lucide-react";
import type { Shape, LineShape, PolygonShape } from "./types";

interface MeasurementSummaryProps {
  elements: Shape[];
  /** Converts pixel distance to formatted string (e.g. "12.5 ft") */
  formatDistance?: (pxDist: number) => string;
  /** Converts pixel² area to formatted string (e.g. "150.2 SF") */
  formatArea?: (pxArea: number) => string;
  /** Whether scale is calibrated */
  isCalibrated: boolean;
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
}: MeasurementSummaryProps) {
  const [expanded, setExpanded] = useState(false);

  const { lines, polygons, totalLinePx, totalAreaPx } = useMemo(() => {
    const lines = elements.filter((e): e is LineShape => e.type === "line");
    const polygons = elements.filter((e): e is PolygonShape => e.type === "polygon");
    const totalLinePx = lines.reduce((sum, l) => sum + computeLineLength(l), 0);
    const totalAreaPx = polygons.reduce((sum, p) => sum + computePolygonArea(p), 0);
    return { lines, polygons, totalLinePx, totalAreaPx };
  }, [elements]);

  const hasAny = lines.length > 0 || polygons.length > 0;
  if (!hasAny) return null;

  const fmtDist = (px: number) => (formatDistance ? formatDistance(px) : `${Math.round(px)}px`);
  const fmtArea = (px: number) => (formatArea ? formatArea(px) : `${Math.round(px)}px²`);

  return (
    <div className="absolute top-14 right-4 z-30 bg-black/80 backdrop-blur-sm rounded-lg border border-white/20 text-white text-xs max-w-[260px] shadow-lg">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full px-3 py-2 hover:bg-white/10 rounded-lg transition-colors"
      >
        <Sigma size={14} className="text-amber-400 shrink-0" />
        <span className="font-semibold text-[11px] uppercase tracking-wide">Measurements</span>
        <span className="ml-auto text-[10px] text-white/60">
          {lines.length}L · {polygons.length}A
        </span>
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {/* Collapsed summary */}
      {!expanded && (
        <div className="px-3 pb-2 flex gap-3 text-[11px]">
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
            <div>
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

          {!isCalibrated && (
            <p className="text-amber-400/80 text-[10px] mt-2 italic">
              Calibrate scale for real-world units
            </p>
          )}
        </div>
      )}
    </div>
  );
}
