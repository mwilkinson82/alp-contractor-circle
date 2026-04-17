/**
 * WhatsNewModal — Branded changelog modal that shows users recent features.
 * Displays on first login after new features ship, or when user clicks "What's New".
 * Uses localStorage to track the last-seen changelog version.
 */
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles,
  Ruler,
  GanttChart,
  Wrench,
  Palette,
  Zap,
  ChevronRight,
  PartyPopper,
  Layers,
  ScanLine,
  DollarSign,
  BarChart3,
  PenTool,
} from "lucide-react";

// ─── Changelog Entries ──────────────────────────────────────────────────────

interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  highlights: Array<{
    icon: any;
    label: string;
    description: string;
    tag?: "new" | "improved" | "fix";
  }>;
}

const CHANGELOG: ChangelogEntry[] = [
  {
    version: "2026.04.17",
    date: "April 17, 2026",
    title: "Trade Specialty Intelligence & Branding",
    highlights: [
      {
        icon: Wrench,
        label: "Trade Specialty Intelligence",
        description:
          "18 specialties across 8 CSI divisions. The ConstructLine engine now auto-detects specialties from your drawings and generates specialty-specific line items a sub would include — even when they're not on the plans.",
        tag: "new",
      },
      {
        icon: Palette,
        label: "Branded ConstructLine Experience",
        description:
          "Consistent Construct\u200BLine branding throughout the entire app — sidebar, headers, processing overlay, modals, and analysis screens.",
        tag: "improved",
      },
      {
        icon: Sparkles,
        label: "Cinematic Splash Animation",
        description:
          "New branded splash intro when the ConstructLine engine starts analyzing your drawings — wordmark reveal with glow pulse before transitioning to the working state.",
        tag: "new",
      },
      {
        icon: GanttChart,
        label: "CPM Schedule Settings Emphasis",
        description:
          "Settings button in the CPM Schedule toolbar is now visually prominent with amber styling — easier to find the powerful configuration options.",
        tag: "improved",
      },
    ],
  },
  {
    version: "2026.04.16",
    date: "April 16, 2026",
    title: "Measurement Tools & Drawing Markup",
    highlights: [
      {
        icon: Ruler,
        label: "On-Drawing Measurements",
        description:
          "Measure distances, areas, and perimeters directly on your construction drawings. Auto-calibrate from known dimensions on the plan.",
        tag: "new",
      },
      {
        icon: PenTool,
        label: "Drawing Markup Mode",
        description:
          "Annotate drawings with freehand, lines, rectangles, circles, arrows, and text. Hold Space + Drag to pan while marking up.",
        tag: "new",
      },
      {
        icon: ScanLine,
        label: "Fullscreen Drawing Viewer",
        description:
          "View any drawing sheet in fullscreen with smooth pan and zoom. Click any line item to jump to the relevant sheet.",
        tag: "new",
      },
    ],
  },
  {
    version: "2026.04.14",
    date: "April 14, 2026",
    title: "Consolidate & Enhance + Bid Calculator",
    highlights: [
      {
        icon: Layers,
        label: "Consolidate & Enhance",
        description:
          "One-click post-processing that merges duplicates across sheets, converts lump sums to measured quantities, calculates concrete volumes, and enforces scope compliance.",
        tag: "new",
      },
      {
        icon: DollarSign,
        label: "Bid Calculator",
        description:
          "Apply overhead, profit, contingency, and bond percentages to your takeoff total. Export a bid-ready summary.",
        tag: "new",
      },
      {
        icon: BarChart3,
        label: "CPM Schedule Reports",
        description:
          "Resource Leveling, Earned Value Management (BCWP/BCWS/ACWP/SPI/CPI), Cash Flow S-Curve, Resource Histogram, Delay Analysis, Cost Forecast, and Health Score reports.",
        tag: "new",
      },
    ],
  },
];

// Current version — bump this when adding new entries
const CURRENT_VERSION = CHANGELOG[0].version;
const STORAGE_KEY = "alp-whats-new-seen";

// ─── Tag Badge ──────────────────────────────────────────────────────────────

function TagBadge({ tag }: { tag: "new" | "improved" | "fix" }) {
  const styles = {
    new: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
    improved: "bg-amber-500/15 text-amber-300 border-amber-500/25",
    fix: "bg-blue-500/15 text-blue-300 border-blue-500/25",
  };
  const labels = { new: "New", improved: "Improved", fix: "Fix" };
  return (
    <Badge className={`${styles[tag]} text-[9px] font-medium px-1.5 py-0`}>
      {labels[tag]}
    </Badge>
  );
}

// ─── Hook: useWhatsNew ──────────────────────────────────────────────────────

export function useWhatsNew() {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (seen !== CURRENT_VERSION) {
      // Small delay so the page loads first
      const timer = setTimeout(() => setShowModal(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
    setShowModal(false);
  };

  const openManually = () => setShowModal(true);

  return { showModal, dismiss, openManually };
}

// ─── Modal Component ────────────────────────────────────────────────────────

export function WhatsNewModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[560px] bg-navy-deep border-amber-500/20 p-0 overflow-hidden">
        {/* Header with branded accent */}
        <div className="relative">
          <div className="h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 bg-[length:200%_100%] animate-[shimmer_2s_ease-in-out_infinite]" />
          <DialogHeader className="px-6 pt-5 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <PartyPopper className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-cream">
                  What's New in{" "}
                  <span className="text-white font-black tracking-tight">
                    Construct
                  </span>
                  <span className="text-amber-400 font-black tracking-tight">
                    Line
                  </span>
                </DialogTitle>
                <p className="text-xs text-cream-muted mt-0.5">
                  Latest features and improvements
                </p>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Scrollable changelog */}
        <ScrollArea className="max-h-[60vh] px-6 pb-2">
          <div className="space-y-6">
            {CHANGELOG.map((entry, entryIdx) => (
              <div key={entry.version}>
                {/* Version header */}
                <div className="flex items-center gap-2 mb-3">
                  <Badge
                    variant="outline"
                    className="text-[10px] font-mono text-amber-400 border-amber-500/30 bg-amber-500/5"
                  >
                    v{entry.version}
                  </Badge>
                  <span className="text-[11px] text-cream-muted">
                    {entry.date}
                  </span>
                  {entryIdx === 0 && (
                    <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/25 text-[9px]">
                      Latest
                    </Badge>
                  )}
                </div>
                <h3 className="text-sm font-semibold text-cream mb-3">
                  {entry.title}
                </h3>

                {/* Highlights */}
                <div className="space-y-2.5">
                  {entry.highlights.map((h, i) => {
                    const Icon = h.icon;
                    return (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-amber-500/15 transition-colors"
                      >
                        <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Icon className="w-3.5 h-3.5 text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-medium text-cream">
                              {h.label}
                            </span>
                            {h.tag && <TagBadge tag={h.tag} />}
                          </div>
                          <p className="text-xs text-cream-muted leading-relaxed">
                            {h.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Divider between entries */}
                {entryIdx < CHANGELOG.length - 1 && (
                  <div className="h-px bg-white/[0.06] mt-5" />
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/[0.06] flex items-center justify-between">
          <p className="text-[10px] text-cream-muted/50">
            <span className="text-white font-semibold">Construct</span>
            <span className="text-amber-400 font-semibold">Line</span>
            {" "}· Powered by ALP
          </p>
          <Button
            onClick={onClose}
            className="bg-amber-500 hover:bg-amber-600 text-navy-deep font-semibold text-sm px-5"
          >
            Got it
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
