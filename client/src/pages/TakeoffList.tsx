/**
 * TakeoffList — List of ConstructLine Takeoff projects.
 * Members can create new projects, view existing ones, and see status.
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus,
  FileStack,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Upload,
  Trash2,
  ArrowRight,
  FileText,
  RefreshCw,
  Layers,
  MapPin,
  DollarSign,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: "Draft", color: "bg-gray-500/20 text-gray-300 border-gray-500/30", icon: FileText },
  uploading: { label: "Uploading", color: "bg-blue-500/20 text-blue-300 border-blue-500/30", icon: Upload },
  processing: { label: "Processing", color: "bg-amber-500/20 text-amber-300 border-amber-500/30", icon: Loader2 },
  completed: { label: "Completed", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", icon: CheckCircle2 },
  error: { label: "Error", color: "bg-red-500/20 text-red-300 border-red-500/30", icon: AlertCircle },
};

function formatCurrency(cents: number, currencyCode: string = "USD"): string {
  const locale = currencyCode === "GBP" ? "en-GB" : currencyCode === "AUD" ? "en-AU" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export default function TakeoffList() {
  const [, navigate] = useLocation();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: projects, isLoading, refetch } = trpc.takeoff.listProjects.useQuery();
  const createMutation = trpc.takeoff.createProject.useMutation({
    onSuccess: (result) => {
      toast.success("Project created! Upload your drawings and click Analyze.");
      setShowCreate(false);
      setNewName("");
      setNewDesc("");
      navigate(`/takeoff/${result.id}`);
    },
    onError: (err) => toast.error(err.message),
  });
  const deleteMutation = trpc.takeoff.deleteProject.useMutation({
    onSuccess: () => {
      toast.success("Project deleted");
      setDeleteId(null);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });
  const recalcMutation = trpc.takeoff.recalculateStatus.useMutation({
    onSuccess: (result) => {
      toast.success(`Status recalculated: ${result.status} (${result.processedSheets} sheets done)`);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleCreate = () => {
    createMutation.mutate({
      name: newName,
      description: newDesc || undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-4">
            {/* ConstructLine Brand Mark */}
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-white leading-tight">Construct<span className="text-amber-400">Line</span></span>
              <span className="text-[9px] text-gray-500 tracking-wider uppercase leading-tight">Powered by ALP</span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div>
              <h1 className="text-xl font-bold text-cream">Quantity Takeoff</h1>
              <p className="text-cream-muted text-sm">
                Upload construction drawings and let ConstructLine extract quantities, costs, and a schedule of values.
              </p>
            </div>
          </div>
        </div>
        <Button
          data-tour="takeoff-new-project"
          onClick={() => setShowCreate(true)}
          className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold shadow-lg"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Takeoff
        </Button>
      </div>

      {/* Project Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      ) : !projects?.length ? (
        <Card className="bg-navy-medium/50 border-white/10">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
              <FileStack className="w-8 h-8 text-amber-500" />
            </div>
            <h3 className="text-lg font-semibold text-cream mb-2">No Takeoff Projects Yet</h3>
            <p className="text-cream-muted text-center max-w-md mb-6">
              Create your first project, upload construction drawings, and let ConstructLine extract a complete quantity takeoff in minutes.
            </p>
            <Button
              onClick={() => setShowCreate(true)}
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First Takeoff
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div data-tour="takeoff-project-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project: any) => {
            const statusConfig = STATUS_CONFIG[project.status] || STATUS_CONFIG.draft;
            const StatusIcon = statusConfig.icon;
            // Parse selected divisions for display
            let divCount: number | null = null;
            try {
              if (project.selectedDivisions) {
                const parsed = JSON.parse(project.selectedDivisions);
                if (Array.isArray(parsed)) divCount = parsed.length;
              }
            } catch { /* ignore */ }

            return (
              <Card
                key={project.id}
                className="bg-navy-medium/50 border-white/10 hover:border-amber-500/30 transition-all cursor-pointer group"
                onClick={() => navigate(`/takeoff/${project.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-cream text-lg group-hover:text-amber-400 transition-colors line-clamp-1">
                      {project.name}
                    </CardTitle>
                    <Badge className={`${statusConfig.color} border text-xs flex items-center gap-1`}>
                      <StatusIcon className={`w-3 h-3 ${project.status === "processing" ? "animate-spin" : ""}`} />
                      {statusConfig.label}
                    </Badge>
                  </div>
                  {project.description && (
                    <CardDescription className="text-cream-muted line-clamp-2">
                      {project.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4 text-cream-muted">
                      <span className="flex items-center gap-1">
                        <FileStack className="w-3.5 h-3.5" />
                        {project.totalSheets} {project.totalSheets === 1 ? "sheet" : "sheets"}
                      </span>
                      {project.processedSheets > 0 && (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          {project.processedSheets} done
                        </span>
                      )}
                    </div>
                    {project.totalEstimatedCost > 0 && (
                      <span className="font-semibold text-amber-400">
                        {formatCurrency(project.totalEstimatedCost, project.currency || "USD")}
                      </span>
                    )}
                  </div>
                  {/* Division, Region & Currency badges */}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {project.currency && project.currency !== "USD" && (
                      <Badge className="bg-amber-500/10 text-amber-300 border-amber-500/20 text-[10px]">
                        <DollarSign className="w-2.5 h-2.5 mr-1" />
                        {project.currency}
                      </Badge>
                    )}
                    {divCount !== null && (
                      <Badge className="bg-blue-500/10 text-blue-300 border-blue-500/20 text-[10px]">
                        <Layers className="w-2.5 h-2.5 mr-1" />
                        {divCount} div{divCount !== 1 ? "s" : ""}
                      </Badge>
                    )}
                    {!divCount && (
                      <Badge className="bg-white/5 text-cream-muted/60 border-white/10 text-[10px]">
                        <Layers className="w-2.5 h-2.5 mr-1" />
                        All divs
                      </Badge>
                    )}
                    {project.costRegion && (
                      <Badge className="bg-emerald-500/10 text-emerald-300 border-emerald-500/20 text-[10px]">
                        <MapPin className="w-2.5 h-2.5 mr-1" />
                        {project.costRegion}
                        {project.costMultiplier && ` (${(project.costMultiplier / 10000).toFixed(2)}x)`}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                    <span className="text-xs text-cream-muted">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-2">
                      {project.status === "processing" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-cream-muted hover:text-amber-400"
                          title="Recalculate status"
                          onClick={(e) => {
                            e.stopPropagation();
                            recalcMutation.mutate({ projectId: project.id });
                          }}
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-cream-muted hover:text-red-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(project.id);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                      <ArrowRight className="w-4 h-4 text-cream-muted group-hover:text-amber-400 transition-colors" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog — simplified: just name + description */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl text-cream">New Takeoff Project</DialogTitle>
            <DialogDescription className="text-cream-muted">
              Name your project, then upload drawings and click "Analyze" to configure currency, divisions, and regional pricing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {/* Project Name */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-cream">Project Name</Label>
              <Input
                placeholder="e.g. Smith Residence Bid"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
                className="bg-white/5 border-white/10 text-cream placeholder:text-cream-muted/50"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-sm text-cream-muted">Description (optional)</Label>
              <Textarea
                placeholder="Brief description of the project..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={2}
                className="bg-white/5 border-white/10 text-cream placeholder:text-cream-muted/50 resize-none"
              />
            </div>

            {/* Helpful hint */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/15">
              <Layers className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-cream-muted">
                After creating your project, upload your construction drawings and click <strong className="text-amber-400">"Analyze Drawings"</strong> — that's where you'll choose your currency, CSI divisions, and regional pricing.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} className="text-cream-muted hover:text-cream">
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newName.trim() || createMutation.isPending}
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
            >
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project?</DialogTitle>
            <DialogDescription>
              This will permanently delete the project, all drawing sheets, and extracted quantities. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
