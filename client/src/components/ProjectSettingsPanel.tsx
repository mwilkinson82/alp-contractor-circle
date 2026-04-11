/**
 * ProjectSettingsPanel — Edit takeoff project divisions and cost region after creation.
 *
 * Features:
 * - Edit selected divisions (affects future extractions only)
 * - Edit cost region (recalculates all item costs automatically)
 * - Shows current settings with badges
 * - Confirmation before saving changes
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import DivisionSelector from "@/components/DivisionSelector";
import RegionSelector from "@/components/RegionSelector";
import { Loader2, Settings, AlertCircle } from "lucide-react";

interface ProjectSettingsPanelProps {
  projectId: number;
  currentDivisions: string[] | null;
  currentRegion: string | null;
  currentRegionName?: string;
  onSave: (divisions: string[] | null, region: string | null) => Promise<{ regionChanged?: boolean }>;
}

export default function ProjectSettingsPanel({
  projectId,
  currentDivisions,
  currentRegion,
  currentRegionName,
  onSave,
}: ProjectSettingsPanelProps) {
  const [open, setOpen] = useState(false);
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>(currentDivisions || []);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(currentRegion || null);
  const [saving, setSaving] = useState(false);

  const divisionsChanged = JSON.stringify(selectedDivisions.sort()) !== JSON.stringify((currentDivisions || []).sort());
  const regionChanged = selectedRegion !== currentRegion;
  const hasChanges = divisionsChanged || regionChanged;

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await onSave(selectedDivisions.length > 0 ? selectedDivisions : null, selectedRegion);

      if (result.regionChanged) {
        toast.success("Region updated — all item costs recalculated!");
      } else if (hasChanges) {
        toast.success("Settings updated!");
      }

      setOpen(false);
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="border-white/10 text-cream-muted hover:text-cream hover:bg-white/5"
      >
        <Settings className="w-4 h-4 mr-2" />
        Edit Settings
      </Button>

      {/* Settings Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Project Settings</DialogTitle>
            <DialogDescription>
              Adjust divisions (affects future extractions) and cost region (recalculates all costs).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Current Settings Summary */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-2">
              <div className="text-xs font-medium text-cream-muted">Current Settings</div>
              <div className="flex flex-wrap gap-2">
                {currentDivisions && currentDivisions.length > 0 ? (
                  <>
                    <Badge className="bg-blue-500/10 text-blue-300 border-blue-500/20">
                      {currentDivisions.length} divisions
                    </Badge>
                  </>
                ) : (
                  <Badge className="bg-white/5 text-cream-muted border-white/10">
                    All divisions
                  </Badge>
                )}
                {currentRegion ? (
                  <Badge className="bg-emerald-500/10 text-emerald-300 border-emerald-500/20">
                    {currentRegionName || currentRegion}
                  </Badge>
                ) : (
                  <Badge className="bg-white/5 text-cream-muted border-white/10">
                    National Average
                  </Badge>
                )}
              </div>
            </div>

            {/* Division Selector */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-cream">
                CSI Divisions
                <span className="text-xs text-cream-muted ml-2">(affects future extractions only)</span>
              </div>
              <DivisionSelector
                value={selectedDivisions}
                onChange={setSelectedDivisions}
                defaultExpanded={false}
              />
              {divisionsChanged && (
                <div className="flex items-start gap-2 p-2 rounded-md bg-blue-500/10 border border-blue-500/20">
                  <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-blue-300">
                    Division changes only affect future sheet extractions. Existing items will not be affected.
                  </span>
                </div>
              )}
            </div>

            {/* Region Selector */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-cream">
                Cost Region
                <span className="text-xs text-cream-muted ml-2">(recalculates all costs)</span>
              </div>
              <RegionSelector
                value={selectedRegion}
                onChange={setSelectedRegion}
                defaultExpanded={false}
              />
              {regionChanged && (
                <div className="flex items-start gap-2 p-2 rounded-md bg-amber-500/10 border border-amber-500/20">
                  <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-amber-300">
                    Region change will automatically recalculate all item costs based on the new regional multiplier.
                  </span>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedDivisions(currentDivisions || []);
                setSelectedRegion(currentRegion || null);
                setOpen(false);
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Settings className="w-4 h-4 mr-2" />
              )}
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
