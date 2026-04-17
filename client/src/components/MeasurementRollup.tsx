/**
 * MeasurementRollup — Aggregates markup measurements across all drawing sheets
 * in a takeoff project. Shows per-sheet and project-wide totals for lines,
 * areas, and counts. Exports to CSV or Excel.
 */
import { useState, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Ruler,
  Pentagon,
  Hash,
  FileSpreadsheet,
  Download,
  ChevronDown,
  ChevronRight,
  Sigma,
  Layers,
} from "lucide-react";
import type { Shape, LineShape, PolygonShape, CountShape } from "@/components/markup/types";

// ─── Types ──────────────────────────────────────────────────────────────────

interface SheetMarkupData {
  sheetId: number;
  sheetName: string;
  pageNumber: number;
  shapesJson: string;
  scaleRatio: number;
  scaleUnit: string;
}

interface MeasurementRollupProps {
  open: boolean;
  onClose: () => void;
  markups: SheetMarkupData[];
  projectName: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

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

function colorName(hex: string): string {
  const map: Record<string, string> = {
    "#EF4444": "Red", "#ef4444": "Red",
    "#F97316": "Orange", "#f97316": "Orange",
    "#EAB308": "Yellow", "#eab308": "Yellow",
    "#22C55E": "Green", "#22c55e": "Green",
    "#3B82F6": "Blue", "#3b82f6": "Blue",
    "#8B5CF6": "Purple", "#8b5cf6": "Purple",
    "#EC4899": "Pink", "#ec4899": "Pink",
    "#FFFFFF": "White", "#ffffff": "White",
    "#000000": "Black",
  };
  return map[hex] || hex;
}

function formatDist(pxDist: number, scaleRatio: number, scaleUnit: string): string {
  if (scaleRatio <= 0) return `${Math.round(pxDist)}px`;
  const real = pxDist / scaleRatio;
  const unitLabel = scaleUnit === "ft" ? "LF" : scaleUnit;
  return `${real.toFixed(1)} ${unitLabel}`;
}

function formatArea(pxArea: number, scaleRatio: number, scaleUnit: string): string {
  if (scaleRatio <= 0) return `${Math.round(pxArea)}px²`;
  const real = pxArea / (scaleRatio * scaleRatio);
  const unitLabel = scaleUnit === "ft" ? "SF" : scaleUnit === "m" ? "m²" : scaleUnit + "²";
  return `${real.toFixed(1)} ${unitLabel}`;
}

function realDist(pxDist: number, scaleRatio: number): number {
  return scaleRatio > 0 ? pxDist / scaleRatio : pxDist;
}

function realArea(pxArea: number, scaleRatio: number): number {
  return scaleRatio > 0 ? pxArea / (scaleRatio * scaleRatio) : pxArea;
}

// ─── Per-sheet parsed data ──────────────────────────────────────────────────

interface SheetData {
  sheetName: string;
  pageNumber: number;
  scaleRatio: number;
  scaleUnit: string;
  isCalibrated: boolean;
  lines: LineShape[];
  polygons: PolygonShape[];
  counts: CountShape[];
  totalLinePx: number;
  totalAreaPx: number;
}

function parseSheetMarkup(m: SheetMarkupData): SheetData {
  let shapes: Shape[] = [];
  try { shapes = JSON.parse(m.shapesJson); } catch { /* empty */ }
  const lines = shapes.filter((s): s is LineShape => s.type === "line");
  const polygons = shapes.filter((s): s is PolygonShape => s.type === "polygon");
  const counts = shapes.filter((s): s is CountShape => s.type === "count");
  return {
    sheetName: m.sheetName,
    pageNumber: m.pageNumber,
    scaleRatio: m.scaleRatio,
    scaleUnit: m.scaleUnit,
    isCalibrated: m.scaleRatio > 0,
    lines,
    polygons,
    counts,
    totalLinePx: lines.reduce((s, l) => s + computeLineLength(l), 0),
    totalAreaPx: polygons.reduce((s, p) => s + computePolygonArea(p), 0),
  };
}

// ─── Component ──────────────────────────────────────────────────────────────

export function MeasurementRollup({ open, onClose, markups, projectName }: MeasurementRollupProps) {
  const [expandedSheets, setExpandedSheets] = useState<Set<number>>(new Set());

  const sheets = useMemo(() => markups.map(parseSheetMarkup), [markups]);

  // Filter to sheets that actually have measurements
  const sheetsWithData = useMemo(
    () => sheets.filter((s) => s.lines.length > 0 || s.polygons.length > 0 || s.counts.length > 0),
    [sheets],
  );

  // Project-wide totals
  const totals = useMemo(() => {
    let totalLines = 0;
    let totalPolygons = 0;
    let totalCounts = 0;
    let totalRealDist = 0;
    let totalRealArea = 0;
    let allCalibrated = true;
    const distUnit = sheetsWithData[0]?.scaleUnit || "ft";
    const areaUnit = distUnit === "ft" ? "SF" : distUnit === "m" ? "m²" : distUnit + "²";
    const distLabel = distUnit === "ft" ? "LF" : distUnit;

    // Count rollup by label across all sheets
    const countsByLabel = new Map<string, { count: number; color: string }>();

    for (const sheet of sheetsWithData) {
      totalLines += sheet.lines.length;
      totalPolygons += sheet.polygons.length;
      totalCounts += sheet.counts.length;
      if (!sheet.isCalibrated) allCalibrated = false;
      totalRealDist += sheet.lines.reduce((s, l) => s + realDist(computeLineLength(l), sheet.scaleRatio), 0);
      totalRealArea += sheet.polygons.reduce((s, p) => s + realArea(computePolygonArea(p), sheet.scaleRatio), 0);
      for (const c of sheet.counts) {
        const key = c.label || "(unlabeled)";
        const existing = countsByLabel.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          countsByLabel.set(key, { count: 1, color: c.color });
        }
      }
    }

    return {
      totalLines,
      totalPolygons,
      totalCounts,
      totalRealDist,
      totalRealArea,
      allCalibrated,
      distLabel,
      areaUnit,
      countsByLabel: Array.from(countsByLabel.entries()).map(([label, v]) => ({ label, ...v })),
    };
  }, [sheetsWithData]);

  const toggleSheet = useCallback((pageNumber: number) => {
    setExpandedSheets((prev) => {
      const next = new Set(prev);
      if (next.has(pageNumber)) next.delete(pageNumber);
      else next.add(pageNumber);
      return next;
    });
  }, []);

  // ── CSV Export ─────────────────────────────────────────────────────────────

  const exportCSV = useCallback(() => {
    const rows: string[][] = [];
    rows.push(["Sheet", "Type", "Label", "Color", "Value", "Unit"]);

    for (const sheet of sheetsWithData) {
      const sn = sheet.sheetName;
      const fDist = (px: number) => formatDist(px, sheet.scaleRatio, sheet.scaleUnit);
      const fArea = (px: number) => formatArea(px, sheet.scaleRatio, sheet.scaleUnit);

      // Lines
      sheet.lines.forEach((line, i) => {
        rows.push([sn, "Line", `L${i + 1}`, colorName(line.color), fDist(computeLineLength(line)), sheet.isCalibrated ? (sheet.scaleUnit === "ft" ? "LF" : sheet.scaleUnit) : "px"]);
      });
      if (sheet.lines.length > 1) {
        rows.push([sn, "Line Subtotal", "", "", fDist(sheet.totalLinePx), ""]);
      }

      // Areas
      sheet.polygons.forEach((poly, i) => {
        rows.push([sn, "Area", `A${i + 1}`, colorName(poly.color), fArea(computePolygonArea(poly)), sheet.isCalibrated ? (sheet.scaleUnit === "ft" ? "SF" : sheet.scaleUnit + "²") : "px²"]);
      });
      if (sheet.polygons.length > 1) {
        rows.push([sn, "Area Subtotal", "", "", fArea(sheet.totalAreaPx), ""]);
      }

      // Counts grouped by label
      const labelMap = new Map<string, CountShape[]>();
      for (const c of sheet.counts) {
        const key = c.label || "(unlabeled)";
        const arr = labelMap.get(key) || [];
        arr.push(c);
        labelMap.set(key, arr);
      }
      for (const [label, items] of Array.from(labelMap.entries())) {
        rows.push([sn, "Count", label, colorName(items[0].color), String(items.length), "items"]);
      }
    }

    // Grand totals
    rows.push([]);
    rows.push(["PROJECT TOTALS", "", "", "", "", ""]);
    if (totals.totalLines > 0) {
      rows.push(["", "Total Lines", `${totals.totalLines} measurements`, "", `${totals.totalRealDist.toFixed(1)}`, totals.distLabel]);
    }
    if (totals.totalPolygons > 0) {
      rows.push(["", "Total Areas", `${totals.totalPolygons} measurements`, "", `${totals.totalRealArea.toFixed(1)}`, totals.areaUnit]);
    }
    if (totals.totalCounts > 0) {
      rows.push(["", "Total Counts", `${totals.totalCounts} items`, "", String(totals.totalCounts), "items"]);
      for (const { label, count } of totals.countsByLabel) {
        rows.push(["", "", label, "", String(count), "items"]);
      }
    }

    const csvContent = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${projectName.replace(/[^a-zA-Z0-9_-]/g, "_")}_All_Measurements.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [sheetsWithData, totals, projectName]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col bg-navy-deep border-white/10">
        <DialogHeader>
          <DialogTitle className="text-cream flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400" />
            Measurement Rollup — All Sheets
          </DialogTitle>
          <DialogDescription className="text-cream-muted">
            Aggregated measurements across {sheetsWithData.length} sheet{sheetsWithData.length !== 1 ? "s" : ""} with markup data
          </DialogDescription>
        </DialogHeader>

        {sheetsWithData.length === 0 ? (
          <div className="py-12 text-center text-cream-muted">
            <Sigma className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No measurement markups found.</p>
            <p className="text-sm mt-1">Open individual sheets and use the markup tools to measure lines, areas, and counts.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-1 space-y-3">
            {/* ── Project-wide totals card ──────────────────────────────── */}
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sigma className="w-4 h-4 text-amber-400" />
                <span className="text-amber-400 font-bold text-sm uppercase tracking-wider">Project Totals</span>
                <span className="text-cream-muted text-xs ml-auto">
                  {sheetsWithData.length} sheet{sheetsWithData.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {totals.totalLines > 0 && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-center">
                    <Ruler className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                    <div className="text-blue-300 font-bold text-lg font-mono">
                      {totals.allCalibrated ? `${totals.totalRealDist.toFixed(1)}` : totals.totalLines}
                    </div>
                    <div className="text-blue-400/60 text-xs">
                      {totals.allCalibrated ? totals.distLabel : `line${totals.totalLines !== 1 ? "s" : ""}`}
                    </div>
                    <div className="text-cream-muted/40 text-[10px] mt-0.5">
                      {totals.totalLines} measurement{totals.totalLines !== 1 ? "s" : ""}
                    </div>
                  </div>
                )}
                {totals.totalPolygons > 0 && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
                    <Pentagon className="w-5 h-5 text-green-400 mx-auto mb-1" />
                    <div className="text-green-300 font-bold text-lg font-mono">
                      {totals.allCalibrated ? `${totals.totalRealArea.toFixed(1)}` : totals.totalPolygons}
                    </div>
                    <div className="text-green-400/60 text-xs">
                      {totals.allCalibrated ? totals.areaUnit : `area${totals.totalPolygons !== 1 ? "s" : ""}`}
                    </div>
                    <div className="text-cream-muted/40 text-[10px] mt-0.5">
                      {totals.totalPolygons} measurement{totals.totalPolygons !== 1 ? "s" : ""}
                    </div>
                  </div>
                )}
                {totals.totalCounts > 0 && (
                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 text-center">
                    <Hash className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                    <div className="text-purple-300 font-bold text-lg font-mono">
                      {totals.totalCounts}
                    </div>
                    <div className="text-purple-400/60 text-xs">
                      count{totals.totalCounts !== 1 ? "s" : ""}
                    </div>
                    {totals.countsByLabel.length > 0 && (
                      <div className="mt-1.5 space-y-0.5">
                        {totals.countsByLabel.map(({ label, count, color }) => (
                          <div key={label} className="flex items-center justify-center gap-1 text-[10px] text-cream-muted/60">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                            <span>{label}: {count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {!totals.allCalibrated && (
                <p className="text-amber-400/70 text-xs mt-2 italic">
                  Some sheets are not calibrated — totals may mix pixel and real-world units.
                </p>
              )}
            </div>

            {/* ── Per-sheet breakdown ───────────────────────────────────── */}
            {sheetsWithData.map((sheet) => {
              const isExpanded = expandedSheets.has(sheet.pageNumber);
              const hasLines = sheet.lines.length > 0;
              const hasPolygons = sheet.polygons.length > 0;
              const hasCounts = sheet.counts.length > 0;

              return (
                <div key={sheet.pageNumber} className="bg-navy-medium/50 border border-white/10 rounded-lg overflow-hidden">
                  {/* Sheet header — click to expand */}
                  <button
                    onClick={() => toggleSheet(sheet.pageNumber)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-cream-muted shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-cream-muted shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-cream font-medium text-sm truncate">{sheet.sheetName}</div>
                      <div className="text-cream-muted/60 text-xs">
                        Page {sheet.pageNumber}
                        {sheet.isCalibrated && ` · Scale: 1px = ${(1/sheet.scaleRatio).toFixed(4)} ${sheet.scaleUnit}`}
                        {!sheet.isCalibrated && " · Not calibrated"}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs shrink-0">
                      {hasLines && (
                        <span className="flex items-center gap-1 text-blue-300">
                          <Ruler className="w-3 h-3" />
                          {sheet.isCalibrated
                            ? formatDist(sheet.totalLinePx, sheet.scaleRatio, sheet.scaleUnit)
                            : `${sheet.lines.length}L`}
                        </span>
                      )}
                      {hasPolygons && (
                        <span className="flex items-center gap-1 text-green-300">
                          <Pentagon className="w-3 h-3" />
                          {sheet.isCalibrated
                            ? formatArea(sheet.totalAreaPx, sheet.scaleRatio, sheet.scaleUnit)
                            : `${sheet.polygons.length}A`}
                        </span>
                      )}
                      {hasCounts && (
                        <span className="flex items-center gap-1 text-purple-300">
                          <Hash className="w-3 h-3" />
                          {sheet.counts.length}C
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-4 pb-3 border-t border-white/5 pt-2">
                      {/* Lines */}
                      {hasLines && (
                        <div className="mb-2">
                          <div className="flex items-center gap-1.5 text-blue-300 text-xs font-medium mb-1">
                            <Ruler className="w-3 h-3" />
                            Lines ({sheet.lines.length})
                          </div>
                          <div className="ml-4 space-y-0.5">
                            {sheet.lines.map((line, i) => (
                              <div key={line.id} className="flex items-center justify-between text-xs">
                                <span className="flex items-center gap-1.5 text-cream-muted">
                                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: line.color }} />
                                  L{i + 1}
                                </span>
                                <span className="font-mono text-cream/80">
                                  {formatDist(computeLineLength(line), sheet.scaleRatio, sheet.scaleUnit)}
                                </span>
                              </div>
                            ))}
                            {sheet.lines.length > 1 && (
                              <div className="flex justify-between text-xs font-semibold text-blue-300 pt-0.5 border-t border-white/5">
                                <span>Subtotal</span>
                                <span className="font-mono">{formatDist(sheet.totalLinePx, sheet.scaleRatio, sheet.scaleUnit)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Areas */}
                      {hasPolygons && (
                        <div className="mb-2">
                          <div className="flex items-center gap-1.5 text-green-300 text-xs font-medium mb-1">
                            <Pentagon className="w-3 h-3" />
                            Areas ({sheet.polygons.length})
                          </div>
                          <div className="ml-4 space-y-0.5">
                            {sheet.polygons.map((poly, i) => (
                              <div key={poly.id} className="flex items-center justify-between text-xs">
                                <span className="flex items-center gap-1.5 text-cream-muted">
                                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: poly.color }} />
                                  A{i + 1}
                                </span>
                                <span className="font-mono text-cream/80">
                                  {formatArea(computePolygonArea(poly), sheet.scaleRatio, sheet.scaleUnit)}
                                </span>
                              </div>
                            ))}
                            {sheet.polygons.length > 1 && (
                              <div className="flex justify-between text-xs font-semibold text-green-300 pt-0.5 border-t border-white/5">
                                <span>Subtotal</span>
                                <span className="font-mono">{formatArea(sheet.totalAreaPx, sheet.scaleRatio, sheet.scaleUnit)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Counts */}
                      {hasCounts && (
                        <div className="mb-1">
                          <div className="flex items-center gap-1.5 text-purple-300 text-xs font-medium mb-1">
                            <Hash className="w-3 h-3" />
                            Counts ({sheet.counts.length})
                          </div>
                          <div className="ml-4 space-y-0.5">
                            {(() => {
                              const labelMap = new Map<string, { count: number; color: string }>();
                              for (const c of sheet.counts) {
                                const key = c.label || "(unlabeled)";
                                const existing = labelMap.get(key);
                                if (existing) existing.count += 1;
                                else labelMap.set(key, { count: 1, color: c.color });
                              }
                              return Array.from(labelMap.entries()).map(([label, { count, color }]) => (
                                <div key={label} className="flex items-center justify-between text-xs">
                                  <span className="flex items-center gap-1.5 text-cream-muted">
                                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                    {label}
                                  </span>
                                  <span className="font-mono text-cream/80">{count}</span>
                                </div>
                              ));
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Footer with export buttons ──────────────────────────────── */}
        {sheetsWithData.length > 0 && (
          <div className="flex items-center justify-between pt-3 border-t border-white/10 mt-2">
            <span className="text-cream-muted text-xs">
              {totals.totalLines + totals.totalPolygons + totals.totalCounts} total measurements across {sheetsWithData.length} sheet{sheetsWithData.length !== 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={exportCSV}
                className="h-8 text-xs gap-1.5 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
