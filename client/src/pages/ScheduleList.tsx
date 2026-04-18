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
  Upload,
  FileUp,
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
  const [showXerImport, setShowXerImport] = useState(false);
  const [xerFile, setXerFile] = useState<File | null>(null);
  const [xerScheduleName, setXerScheduleName] = useState("");
  const [xerImporting, setXerImporting] = useState(false);

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

  const xerImportMutation = trpc.schedule.importXer.useMutation({
    onSuccess: (data) => {
      toast.success(`Imported "${data.scheduleName}" — ${data.activitiesImported} activities, ${data.relationshipsImported} relationships, ${data.wbsNodesImported} WBS nodes`);
      setShowXerImport(false);
      setXerFile(null);
      setXerScheduleName("");
      setXerImporting(false);
      window.open(`/scheduler/${data.scheduleId}`, "_blank");
      schedulesQuery.refetch();
    },
    onError: (err) => {
      const msg = err.message || "Unknown error";
      // Provide user-friendly error messages
      if (msg.includes("Service Unavailable") || msg.includes("503")) {
        toast.error("Import timed out — the file may be too large. Try splitting the XER into smaller projects in P6.");
      } else if (msg.includes("Unexpected token")) {
        toast.error("Server returned an error during import. The file may be corrupted or in an unsupported format.");
      } else if (msg.includes("Failed to parse XER")) {
        toast.error(msg);
      } else {
        toast.error(`XER import failed: ${msg}`);
      }
      setXerImporting(false);
    },
  });

  const handleXerImport = async () => {
    if (!xerFile) return;
    setXerImporting(true);
    try {
      const text = await xerFile.text();
      xerImportMutation.mutate({
        xerText: text,
        scheduleName: xerScheduleName || undefined,
      });
    } catch (e: any) {
      toast.error(`Failed to read file: ${e.message}`);
      setXerImporting(false);
    }
  };

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
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowXerImport(true)}
              variant="outline"
              className="border-ember/40 text-ember hover:bg-ember/10"
            >
              <FileUp className="w-4 h-4 mr-2" />
              Import P6 XER
            </Button>
            <Button
              onClick={() => setShowCreate(true)}
              className="bg-ember text-primary-foreground hover:bg-ember-dark"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Schedule
            </Button>
          </div>
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
        <DialogContent className="bg-card border-border max-w-2xl text-base max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle className="font-heading">
              Create New Schedule
            </DialogTitle>
            <DialogDescription>
              Name your project, then pick a starting point below.
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 pr-1 space-y-5 py-2">
            {/* ── Project Details ── */}
            <div className="space-y-3">
              <div>
                <Label>Project Name</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Smith Residence — New Build"
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
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
              </div>
            </div>

            {/* ── Template Picker ── */}
            <div className="rounded-xl border-2 border-emerald-500/40 bg-emerald-500/[0.03] p-4" style={{ boxShadow: '0 0 20px rgba(16,185,129,0.08), inset 0 1px 0 rgba(16,185,129,0.1)' }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-sm font-semibold text-emerald-400 tracking-wide uppercase">Choose a Starting Template</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Pick a pre-built schedule with WBS, activities, logic ties &amp; activity codes — or start blank.</p>

              <div className="grid grid-cols-1 gap-2">
                {/* Blank option */}
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className={`text-left p-3 rounded-lg border-2 transition-all ${
                    selectedTemplate === null
                      ? "border-ember bg-ember/10 text-foreground shadow-[0_0_12px_rgba(217,119,6,0.15)]"
                      : "border-white/10 bg-white/[0.02] text-muted-foreground hover:border-white/20 hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                      <Plus className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">Blank Schedule</div>
                      <div className="text-xs opacity-60">Start from scratch — add your own activities</div>
                    </div>
                  </div>
                </button>

                {/* Template grid — 2 columns for better visual density */}
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {templates.map((t: any) => {
                    const isSelected = selectedTemplate === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTemplate(t.id)}
                        className={`text-left rounded-lg border-2 transition-all overflow-hidden ${
                          isSelected
                            ? "border-ember bg-ember/10 text-foreground shadow-[0_0_12px_rgba(217,119,6,0.15)]"
                            : "border-white/10 bg-white/[0.02] text-muted-foreground hover:border-emerald-500/30 hover:bg-emerald-500/[0.04]"
                        }`}
                      >
                        {/* Thumbnail preview */}
                        {t.thumbnail && (
                          <div className="w-full h-20 bg-zinc-900/50 border-b border-white/5">
                            <img
                              src={t.thumbnail}
                              alt={`${t.name} preview`}
                              className="w-full h-full object-cover opacity-80"
                            />
                          </div>
                        )}
                        <div className="p-3">
                          <div className="font-medium text-sm leading-tight">{t.name}</div>
                          <div className="text-[11px] mt-1 opacity-60 leading-snug line-clamp-2">{t.description}</div>
                          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                              isSelected ? "bg-ember/20 text-ember" : "bg-emerald-500/10 text-emerald-400"
                            }`}>
                              {t.activityCount} activities
                            </span>
                            {t.wbsNodeCount > 0 && (
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                isSelected ? "bg-ember/20 text-ember" : "bg-blue-500/10 text-blue-400"
                              }`}>
                                {t.wbsNodeCount} WBS nodes
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 border-t border-border pt-4">
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
        <DialogContent className="bg-card border-border max-w-xl text-base">
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

      {/* Import P6 XER Dialog */}
      <Dialog open={showXerImport} onOpenChange={(open) => { setShowXerImport(open); if (!open) { setXerFile(null); setXerScheduleName(""); } }}>
        <DialogContent className="bg-card border-border max-w-2xl text-base">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg">Import Primavera P6 XER File</DialogTitle>
            <DialogDescription>
              Upload an .xer file exported from Oracle Primavera P6. Activities, relationships, WBS, calendars, and constraints will be imported.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* File drop zone */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                xerFile ? "border-ember/60 bg-ember/5" : "border-border hover:border-ember/40"
              }`}
              onClick={() => document.getElementById("xer-file-input")?.click()}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const file = e.dataTransfer.files[0];
                if (file && (file.name.endsWith(".xer") || file.name.endsWith(".XER"))) {
                  setXerFile(file);
                  if (!xerScheduleName) setXerScheduleName(file.name.replace(/\.xer$/i, ""));
                } else {
                  toast.error("Please upload a .xer file");
                }
              }}
            >
              <input
                id="xer-file-input"
                type="file"
                accept=".xer,.XER"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setXerFile(file);
                    if (!xerScheduleName) setXerScheduleName(file.name.replace(/\.xer$/i, ""));
                  }
                }}
              />
              {xerFile ? (
                <div className="space-y-2">
                  <FileUp className="w-10 h-10 text-ember mx-auto" />
                  <p className="text-foreground font-medium">{xerFile.name}</p>
                  <p className="text-sm text-muted-foreground">{(xerFile.size / 1024).toFixed(1)} KB</p>
                  <p className="text-xs text-muted-foreground">Click or drop to replace</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-10 h-10 text-muted-foreground/40 mx-auto" />
                  <p className="text-foreground font-medium">Drop your .xer file here</p>
                  <p className="text-sm text-muted-foreground">or click to browse</p>
                </div>
              )}
            </div>

            {/* Schedule name override */}
            <div>
              <Label>Schedule Name (optional — defaults to P6 project name)</Label>
              <Input
                value={xerScheduleName}
                onChange={(e) => setXerScheduleName(e.target.value)}
                placeholder="Leave blank to use P6 project name"
                className="mt-1"
              />
            </div>

            {/* Info box */}
            <div className="bg-muted/30 rounded-lg p-4 text-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">What gets imported:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>All activities with durations, dates, and percent complete</li>
                <li>Predecessor/successor relationships (FS, SS, FF, SF) with lag</li>
                <li>WBS hierarchy with color coding</li>
                <li>Calendars with work weeks and holidays</li>
                <li>Constraint types (SNET, SNLT, FNET, FNLT, MSO, MFO)</li>
                <li>Milestones and activity types</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowXerImport(false)}>Cancel</Button>
            <Button
              onClick={handleXerImport}
              disabled={!xerFile || xerImporting}
              className="bg-ember text-primary-foreground hover:bg-ember-dark"
            >
              {xerImporting ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Importing{xerFile && xerFile.size > 5_000_000 ? " (large file — this may take a minute)" : ""}...</>
              ) : (
                <><FileUp className="w-4 h-4 mr-2" />Import Schedule</>
              )}
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
