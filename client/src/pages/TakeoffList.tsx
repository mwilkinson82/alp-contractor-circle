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
  Target,
} from "lucide-react";
import { getBidModeBehavior } from "../../../shared/bidMode";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: "Draft", color: "bg-white text-[#716855] border-[#d7c7aa]", icon: FileText },
  uploading: { label: "Uploading", color: "bg-blue-50 text-[#244c91] border-blue-200", icon: Upload },
  processing: { label: "Processing", color: "bg-[#fff4cb] text-[#8a6510] border-[#d7b44d]", icon: Loader2 },
  completed: { label: "Completed", color: "bg-emerald-50 text-emerald-800 border-emerald-300", icon: CheckCircle2 },
  error: { label: "Error", color: "bg-orange-50 text-orange-800 border-orange-300", icon: AlertCircle },
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
    <div className="-m-6 min-h-screen space-y-6 bg-[#ece9e1] px-6 py-7 text-[#171714]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-4">
            {/* ConstructLine Brand Mark */}
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-[#171714] leading-tight">Construct<span className="text-[#d9a21a]">Line</span></span>
              <span className="text-[9px] text-[#8a806d] tracking-wider uppercase leading-tight">Powered by ALP</span>
            </div>
            <div className="w-px h-8 bg-[#d7c7aa]" />
            <div>
              <h1 className="text-xl font-bold text-[#171714]">Quantity Takeoff</h1>
              <p className="text-[#716855] text-sm">
                Upload construction drawings and let <span className="font-semibold"><span className="text-[#171714]">Construct</span><span className="text-[#d9a21a]">Line</span></span> extract quantities, costs, and a schedule of values.
              </p>
            </div>
          </div>
        </div>
        <Button
          data-tour="takeoff-new-project"
          onClick={() => setShowCreate(true)}
          className="bg-[#171714] text-white font-semibold shadow-[0_18px_45px_rgba(41,37,28,0.18)] hover:bg-[#29251c]"
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
        <Card className="border-[#d7c7aa] bg-white/80 shadow-[0_18px_50px_rgba(41,37,28,0.08)]">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-[#fff4cb] border border-[#d7b44d] flex items-center justify-center mb-4">
              <FileStack className="w-8 h-8 text-[#8a6510]" />
            </div>
            <h3 className="text-lg font-semibold text-[#171714] mb-2">No Takeoff Projects Yet</h3>
            <p className="text-[#716855] text-center max-w-md mb-6">
              Create your first project, upload construction drawings, and let <span className="font-semibold"><span className="text-[#171714]">Construct</span><span className="text-[#d9a21a]">Line</span></span> extract a complete quantity takeoff in minutes.
            </p>
            <Button
              onClick={() => setShowCreate(true)}
              className="bg-[#171714] text-white hover:bg-[#29251c]"
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
                className="group cursor-pointer border-[#d7c7aa] bg-white/80 shadow-[0_18px_50px_rgba(41,37,28,0.08)] transition-all hover:-translate-y-0.5 hover:border-[#d7b44d] hover:bg-white hover:shadow-[0_24px_70px_rgba(41,37,28,0.14)]"
                onClick={() => navigate(`/takeoff/${project.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="line-clamp-1 text-lg text-[#171714] transition-colors group-hover:text-[#8a6510]">
                      {project.name}
                    </CardTitle>
                    <Badge className={`${statusConfig.color} border text-xs flex items-center gap-1`}>
                      <StatusIcon className={`w-3 h-3 ${project.status === "processing" ? "animate-spin" : ""}`} />
                      {statusConfig.label}
                    </Badge>
                  </div>
                  {project.description && (
                    <CardDescription className="line-clamp-2 text-[#716855]">
                      {project.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4 text-[#716855]">
                      <span className="flex items-center gap-1">
                        <FileStack className="w-3.5 h-3.5" />
                        {project.totalSheets} {project.totalSheets === 1 ? "sheet" : "sheets"}
                      </span>
                      {project.processedSheets > 0 && (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                          {project.processedSheets} done
                        </span>
                      )}
                    </div>
                    {project.totalEstimatedCost > 0 && (
                      <span className="font-semibold text-[#a66d00]">
                        {formatCurrency(project.totalEstimatedCost, project.currency || "USD")}
                      </span>
                    )}
                  </div>
                  {/* Division, Region & Currency badges */}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {project.currency && project.currency !== "USD" && (
                      <Badge className="border-[#d7b44d] bg-[#fff4cb] text-[10px] text-[#8a6510]">
                        <DollarSign className="w-2.5 h-2.5 mr-1" />
                        {project.currency}
                      </Badge>
                    )}
                    <Badge className="border-[#d7b44d] bg-[#fff4cb] text-[10px] text-[#8a6510]">
                      <Target className="w-2.5 h-2.5 mr-1" />
                      {getBidModeBehavior(project.bidMode).shortLabel}
                    </Badge>
                    {divCount !== null && (
                      <Badge className="border-blue-200 bg-blue-50 text-[10px] text-[#244c91]">
                        <Layers className="w-2.5 h-2.5 mr-1" />
                        {divCount} div{divCount !== 1 ? "s" : ""}
                      </Badge>
                    )}
                    {!divCount && (
                      <Badge className="border-[#d7c7aa] bg-white text-[10px] text-[#716855]">
                        <Layers className="w-2.5 h-2.5 mr-1" />
                        All divs
                      </Badge>
                    )}
                    {project.costRegion && (
                      <Badge className="border-emerald-300 bg-emerald-50 text-[10px] text-emerald-800">
                        <MapPin className="w-2.5 h-2.5 mr-1" />
                        {project.costRegion}
                        {project.costMultiplier && ` (${(project.costMultiplier / 10000).toFixed(2)}x)`}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#eadcc4]">
                    <span className="text-xs text-[#716855]">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-2">
                      {project.status === "processing" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-[#716855] hover:bg-[#fff4cb] hover:text-[#8a6510]"
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
                        className="h-7 w-7 p-0 text-[#716855] hover:bg-orange-50 hover:text-orange-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(project.id);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                      <ArrowRight className="w-4 h-4 text-[#716855] group-hover:text-[#8a6510] transition-colors" />
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
        <DialogContent className="border-[#d7c7aa] bg-[#f4efe4] text-[#171714] shadow-[0_32px_90px_rgba(41,37,28,0.34)] [&_[data-slot=dialog-header]]:border-[#d8c9ad] [&_[data-slot=dialog-footer]]:border-[#d8c9ad] [&_[data-slot=dialog-close]]:text-[#716855] [&_[data-slot=dialog-close]]:hover:bg-white [&_[data-slot=dialog-close]]:hover:text-[#171714]">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#171714]">New Takeoff Project</DialogTitle>
            <DialogDescription className="text-[#716855]">
              Name your project, then upload drawings and click "Analyze" to choose the bid mode, scope boundary, currency, and regional pricing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {/* Project Name */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-[#171714]">Project Name</Label>
              <Input
                placeholder="e.g. Smith Residence Bid"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
                className="border-[#d7c7aa] bg-white text-[#171714] placeholder:text-[#8a806d]"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-sm text-[#716855]">Description (optional)</Label>
              <Textarea
                placeholder="Brief description of the project..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={2}
                className="resize-none border-[#d7c7aa] bg-white text-[#171714] placeholder:text-[#8a806d]"
              />
            </div>

            {/* Helpful hint */}
            <div className="flex items-start gap-2 rounded-lg border border-[#d7b44d] bg-[#fff7da] p-3">
              <Layers className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#8a6510]" />
              <p className="text-xs text-[#716855]">
                After creating your project, upload your construction drawings and click <strong className="text-[#8a6510]">"Analyze Drawings"</strong>. Start with Full GC Takeoff, Trade Package Takeoff, or Fast Scope Check so the review surface matches the bid.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} className="border-[#c8b895] bg-white/70 text-[#29251c] hover:bg-white">
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newName.trim() || createMutation.isPending}
              className="bg-[#171714] text-white hover:bg-[#29251c]"
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
        <DialogContent className="border-[#d7c7aa] bg-[#f4efe4] text-[#171714] shadow-[0_32px_90px_rgba(41,37,28,0.34)] [&_[data-slot=dialog-header]]:border-[#d8c9ad] [&_[data-slot=dialog-footer]]:border-[#d8c9ad] [&_[data-slot=dialog-close]]:text-[#716855] [&_[data-slot=dialog-close]]:hover:bg-white [&_[data-slot=dialog-close]]:hover:text-[#171714]">
          <DialogHeader>
            <DialogTitle className="text-[#171714]">Delete Project?</DialogTitle>
            <DialogDescription className="text-[#716855]">
              This will permanently delete the project, all drawing sheets, and extracted quantities. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} className="border-[#c8b895] bg-white/70 text-[#29251c] hover:bg-white">
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
