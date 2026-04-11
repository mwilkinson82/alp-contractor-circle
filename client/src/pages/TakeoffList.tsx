/**
 * TakeoffList — List of Construct Line Takeoff projects.
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
  Sparkles,
  FileText,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: "Draft", color: "bg-gray-500/20 text-gray-300 border-gray-500/30", icon: FileText },
  uploading: { label: "Uploading", color: "bg-blue-500/20 text-blue-300 border-blue-500/30", icon: Upload },
  processing: { label: "Processing", color: "bg-amber-500/20 text-amber-300 border-amber-500/30", icon: Loader2 },
  completed: { label: "Completed", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", icon: CheckCircle2 },
  error: { label: "Error", color: "bg-red-500/20 text-red-300 border-red-500/30", icon: AlertCircle },
};

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
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
      toast.success("Project created!");
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-cream flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            Construct Line Takeoff
          </h1>
          <p className="text-cream-muted mt-1">
            Upload construction drawings and let Construct Line extract quantities, costs, and a schedule of values.
          </p>
        </div>
        <Button
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
              Create your first project, upload construction drawings, and let Construct Line extract a complete quantity takeoff in minutes.
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project: any) => {
            const statusConfig = STATUS_CONFIG[project.status] || STATUS_CONFIG.draft;
            const StatusIcon = statusConfig.icon;
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
                        {formatCurrency(project.totalEstimatedCost)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                    <span className="text-xs text-cream-muted">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-2">
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

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Takeoff Project</DialogTitle>
            <DialogDescription>
              Create a project to upload drawings and extract quantities.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Project Name</Label>
              <Input
                placeholder="e.g. Smith Residence Bid"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                placeholder="Brief description of the project..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate({ name: newName, description: newDesc || undefined })}
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
        <DialogContent className="sm:max-w-sm">
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
