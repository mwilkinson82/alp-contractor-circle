/**
 * Schedule List — Dashboard showing all saved schedules.
 * Members can create new schedules (blank or from template), duplicate, archive, or open them.
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useMember } from "@/hooks/useMember";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocation } from "wouter";
import {
  Plus,
  Calendar,
  Clock,
  MoreVertical,
  Copy,
  Trash2,
  Archive,
  FolderOpen,
  LayoutGrid,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

export default function ScheduleList() {
  const { member, loading: memberLoading, isAuthenticated, getLoginUrl } = useMember();
  const [, setLocation] = useLocation();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newStartDate, setNewStartDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [showDuplicate, setShowDuplicate] = useState<number | null>(null);
  const [duplicateName, setDuplicateName] = useState("");

  const schedulesQuery = trpc.schedule.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const templatesQuery = trpc.schedule.templates.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const createMutation = trpc.schedule.create.useMutation({
    onSuccess: (data) => {
      toast.success("Schedule created");
      setShowCreate(false);
      setNewName("");
      setNewDesc("");
      setSelectedTemplate(null);
      // Navigate to the scheduler
      window.open(`/scheduler/${data.id}`, "_blank");
      schedulesQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const duplicateMutation = trpc.schedule.duplicate.useMutation({
    onSuccess: (data) => {
      toast.success("Schedule duplicated");
      setShowDuplicate(null);
      setDuplicateName("");
      window.open(`/scheduler/${data.id}`, "_blank");
      schedulesQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.schedule.delete.useMutation({
    onSuccess: () => {
      toast.success("Schedule deleted");
      schedulesQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const archiveMutation = trpc.schedule.update.useMutation({
    onSuccess: () => {
      toast.success("Schedule archived");
      schedulesQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const schedules = schedulesQuery.data || [];
  const templates = templatesQuery.data || [];
  const activeSchedules = useMemo(
    () => schedules.filter((s: any) => s.status === "active"),
    [schedules]
  );
  const archivedSchedules = useMemo(
    () => schedules.filter((s: any) => s.status === "archived"),
    [schedules]
  );

  // Auth gate
  if (memberLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-ember" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full bg-card border-border">
          <CardContent className="p-8 text-center space-y-6">
            <Calendar className="w-16 h-16 text-ember mx-auto" />
            <h1 className="text-2xl font-heading font-bold text-foreground">
              CPM Schedule Builder
            </h1>
            <p className="text-muted-foreground">
              Sign in to your Contractor Circle account to access the scheduling
              tool.
            </p>
            <a href={getLoginUrl("/portal/scheduler")}>
              <Button className="bg-ember text-primary-foreground hover:bg-ember-dark w-full">
                Sign In with Discord
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLocation("/portal")}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-heading font-bold text-foreground">
                CPM Schedule Builder
              </h1>
              <p className="text-sm text-muted-foreground">
                {activeSchedules.length} active schedule
                {activeSchedules.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <Button
            onClick={() => setShowCreate(true)}
            className="bg-ember text-primary-foreground hover:bg-ember-dark"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Schedule
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {schedulesQuery.isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-ember" />
          </div>
        ) : activeSchedules.length === 0 && archivedSchedules.length === 0 ? (
          /* Empty state */
          <div className="text-center py-20">
            <LayoutGrid className="w-16 h-16 text-muted-foreground/30 mx-auto mb-6" />
            <h2 className="text-2xl font-heading font-bold text-foreground mb-3">
              No schedules yet
            </h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Create your first CPM schedule from scratch or start with a
              pre-built construction template.
            </p>
            <Button
              onClick={() => setShowCreate(true)}
              className="bg-ember text-primary-foreground hover:bg-ember-dark"
              size="lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Your First Schedule
            </Button>
          </div>
        ) : (
          <>
            {/* Active Schedules */}
            {activeSchedules.length > 0 && (
              <div className="mb-10">
                <h2 className="text-lg font-heading font-semibold text-foreground mb-4">
                  Active Schedules
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeSchedules.map((s: any) => (
                    <ScheduleCard
                      key={s.id}
                      schedule={s}
                      onOpen={() => window.open(`/scheduler/${s.id}`, "_blank")}
                      onDuplicate={() => {
                        setShowDuplicate(s.id);
                        setDuplicateName(`${s.name} (Copy)`);
                      }}
                      onArchive={() =>
                        archiveMutation.mutate({
                          id: s.id,
                          status: "archived",
                        })
                      }
                      onDelete={() => {
                        if (
                          confirm(
                            "Are you sure you want to permanently delete this schedule?"
                          )
                        ) {
                          deleteMutation.mutate({ id: s.id });
                        }
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Archived Schedules */}
            {archivedSchedules.length > 0 && (
              <div>
                <h2 className="text-lg font-heading font-semibold text-muted-foreground mb-4">
                  Archived
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-70">
                  {archivedSchedules.map((s: any) => (
                    <ScheduleCard
                      key={s.id}
                      schedule={s}
                      onOpen={() =>
                        window.open(`/scheduler/${s.id}`, "_blank")
                      }
                      onDuplicate={() => {
                        setShowDuplicate(s.id);
                        setDuplicateName(`${s.name} (Copy)`);
                      }}
                      onArchive={() =>
                        archiveMutation.mutate({
                          id: s.id,
                          status: "active",
                        })
                      }
                      onDelete={() => {
                        if (
                          confirm(
                            "Are you sure you want to permanently delete this schedule?"
                          )
                        ) {
                          deleteMutation.mutate({ id: s.id });
                        }
                      }}
                      isArchived
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Schedule Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">
              Create New Schedule
            </DialogTitle>
            <DialogDescription>
              Start from scratch or choose a construction template.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Project Name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Smith Residence — New Build"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Brief project description"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Project Start Date</Label>
              <Input
                type="date"
                value={newStartDate}
                onChange={(e) => setNewStartDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Template</Label>
              <div className="grid grid-cols-1 gap-2 mt-2">
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className={`text-left p-3 rounded-lg border transition-colors ${
                    selectedTemplate === null
                      ? "border-ember bg-ember/10 text-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-muted-foreground/30"
                  }`}
                >
                  <div className="font-medium text-sm">Blank Schedule</div>
                  <div className="text-xs mt-0.5 opacity-70">
                    Start from scratch
                  </div>
                </button>
                {templates.map((t: any) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTemplate(t.id)}
                    className={`text-left p-3 rounded-lg border transition-colors ${
                      selectedTemplate === t.id
                        ? "border-ember bg-ember/10 text-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-muted-foreground/30"
                    }`}
                  >
                    <div className="font-medium text-sm">{t.name}</div>
                    <div className="text-xs mt-0.5 opacity-70">
                      {t.description} — {t.activityCount} activities
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                createMutation.mutate({
                  name: newName,
                  description: newDesc || undefined,
                  projectStartDate: new Date(newStartDate + "T00:00:00"),
                  templateId: selectedTemplate || undefined,
                })
              }
              disabled={!newName.trim() || createMutation.isPending}
              className="bg-ember text-primary-foreground hover:bg-ember-dark"
            >
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Create Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Dialog */}
      <Dialog
        open={showDuplicate !== null}
        onOpenChange={() => setShowDuplicate(null)}
      >
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading">
              Duplicate Schedule
            </DialogTitle>
          </DialogHeader>
          <div>
            <Label>New Name</Label>
            <Input
              value={duplicateName}
              onChange={(e) => setDuplicateName(e.target.value)}
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDuplicate(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                showDuplicate &&
                duplicateMutation.mutate({
                  id: showDuplicate,
                  name: duplicateName,
                })
              }
              disabled={!duplicateName.trim() || duplicateMutation.isPending}
              className="bg-ember text-primary-foreground hover:bg-ember-dark"
            >
              {duplicateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Duplicate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ScheduleCard({
  schedule,
  onOpen,
  onDuplicate,
  onArchive,
  onDelete,
  isArchived,
}: {
  schedule: any;
  onOpen: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
  isArchived?: boolean;
}) {
  const startDate = new Date(schedule.projectStartDate);
  const updatedAt = new Date(schedule.updatedAt);

  return (
    <Card
      className="bg-card border-border hover:border-ember/30 transition-all cursor-pointer group"
      onClick={onOpen}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-heading font-semibold text-foreground truncate">
              {schedule.name}
            </h3>
            {schedule.description && (
              <p className="text-sm text-muted-foreground truncate mt-0.5">
                {schedule.description}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors opacity-0 group-hover:opacity-100"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-popover border-border"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuItem onClick={onOpen}>
                <FolderOpen className="w-4 h-4 mr-2" />
                Open
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onArchive}>
                <Archive className="w-4 h-4 mr-2" />
                {isArchived ? "Restore" : "Archive"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {startDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {updatedAt.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
