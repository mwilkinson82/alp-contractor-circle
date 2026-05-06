/**
 * ScheduleList - Baseline schedule archive and command desk.
 */
import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useMember } from "@/hooks/useMember";
import { useBetaUser } from "@/hooks/useBetaUser";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocation } from "wouter";
import {
  AlertTriangle,
  Archive,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  FileUp,
  FolderOpen,
  LayoutGrid,
  Loader2,
  MoreVertical,
  Plus,
  SlidersHorizontal,
  Target,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

type ScheduleSummary = {
  id: number;
  name: string;
  description?: string | null;
  projectStartDate: string | Date;
  dataDate?: string | Date | null;
  updatedAt: string | Date;
  status: "active" | "archived";
  activityCount?: number;
  completedCount?: number;
  relationshipCount?: number;
  criticalCount?: number;
  openStartCount?: number;
  openFinishCount?: number;
  projectFinish?: string | Date | null;
};

const formatDate = (value: string | Date | null | undefined, options?: Intl.DateTimeFormatOptions) => {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleDateString("en-US", options ?? { month: "short", day: "numeric", year: "numeric" });
};

const pct = (done = 0, total = 0) => {
  if (!total) return 0;
  return Math.round((done / total) * 100);
};

function getScheduleStatus(schedule: ScheduleSummary) {
  const activityCount = schedule.activityCount ?? 0;
  const openEnds = (schedule.openStartCount ?? 0) + (schedule.openFinishCount ?? 0);
  const relationshipCount = schedule.relationshipCount ?? 0;
  const completion = pct(schedule.completedCount, activityCount);

  if (!activityCount) return { label: "Needs activities", tone: "amber" as const };
  if (openEnds > 0) return { label: `${openEnds} logic review`, tone: "amber" as const };
  if (relationshipCount < Math.max(1, activityCount - 1)) return { label: "Logic light", tone: "amber" as const };
  if (completion >= 100) return { label: "Complete", tone: "green" as const };
  return { label: "Ready to update", tone: "green" as const };
}

function statusClasses(tone: "green" | "amber" | "red") {
  if (tone === "green") return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700";
  if (tone === "red") return "border-red-500/25 bg-red-500/10 text-red-700";
  return "border-amber-500/30 bg-amber-500/10 text-amber-800";
}

export default function ScheduleList() {
  const { member, loading: memberLoading, isAuthenticated, getLoginUrl } = useMember();
  const { betaUser, loading: betaLoading } = useBetaUser();
  const isAllowed = isAuthenticated || !!betaUser;
  const [, setLocation] = useLocation();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newStartDate, setNewStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [showDuplicate, setShowDuplicate] = useState<number | null>(null);
  const [duplicateName, setDuplicateName] = useState("");
  const [duplicateDataDate, setDuplicateDataDate] = useState("");
  const [showXerImport, setShowXerImport] = useState(false);
  const [xerFile, setXerFile] = useState<File | null>(null);
  const [xerScheduleName, setXerScheduleName] = useState("");
  const [xerImporting, setXerImporting] = useState(false);
  const [xerProgress, setXerProgress] = useState("");

  const schedulesQuery = trpc.schedule.list.useQuery(undefined, { enabled: isAllowed });
  const templatesQuery = trpc.schedule.templates.useQuery(undefined, { enabled: isAllowed });

  const createMutation = trpc.schedule.create.useMutation({
    onSuccess: (data) => {
      toast.success("Baseline schedule created");
      setShowCreate(false);
      setNewName("");
      setNewDesc("");
      setSelectedTemplate(null);
      window.open(`/scheduler/${data.id}`, "_blank");
      schedulesQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const duplicateMutation = trpc.schedule.duplicate.useMutation({
    onSuccess: (data) => {
      toast.success("Schedule update created");
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
      toast.success("Schedule archive updated");
      schedulesQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleXerImport = async () => {
    if (!xerFile) return;
    setXerImporting(true);
    setXerProgress("Preparing upload...");
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let safetyTimeout: ReturnType<typeof setTimeout> | null = null;

    try {
      setXerProgress(`Uploading ${(xerFile.size / 1024 / 1024).toFixed(1)} MB...`);
      const formData = new FormData();
      formData.append("xerFile", xerFile);
      if (xerScheduleName) formData.append("scheduleName", xerScheduleName);

      const uploadRes = await fetch("/api/xer/upload", { method: "POST", body: formData });
      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error || `Upload failed (${uploadRes.status})`);
      }

      const { jobId } = await uploadRes.json();
      setXerProgress("Parsing XER file...");
      pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/xer/status/${jobId}`);
          if (!statusRes.ok) return;
          const job = await statusRes.json();
          setXerProgress(job.progressMessage || "Processing...");

          if (job.status === "complete") {
            if (pollInterval) clearInterval(pollInterval);
            if (safetyTimeout) clearTimeout(safetyTimeout);
            const result = job.result as any;
            toast.success(`Imported ${result?.activitiesImported || 0} activities and ${result?.relationshipsImported || 0} relationships`);
            setShowXerImport(false);
            setXerFile(null);
            setXerScheduleName("");
            setXerImporting(false);
            setXerProgress("");
            if (job.scheduleId) window.open(`/scheduler/${job.scheduleId}`, "_blank");
            schedulesQuery.refetch();
          } else if (job.status === "failed") {
            if (pollInterval) clearInterval(pollInterval);
            if (safetyTimeout) clearTimeout(safetyTimeout);
            toast.error(`XER import failed: ${job.errorMessage || "Unknown error"}`);
            setXerImporting(false);
            setXerProgress("");
          }
        } catch {
          // Keep polling; transient status errors are common during large imports.
        }
      }, 2000);

      safetyTimeout = setTimeout(() => {
        if (pollInterval) clearInterval(pollInterval);
        toast.error("Import is taking longer than expected. Check the list again shortly.");
        setXerImporting(false);
        setXerProgress("");
      }, 600000);
    } catch (e: any) {
      if (pollInterval) clearInterval(pollInterval);
      if (safetyTimeout) clearTimeout(safetyTimeout);
      toast.error(`XER import failed: ${e.message || "Unknown error"}`);
      setXerImporting(false);
      setXerProgress("");
    }
  };

  const schedules = (schedulesQuery.data || []) as ScheduleSummary[];
  const templates = templatesQuery.data || [];
  const archiveSchedules = useMemo(
    () => schedules.filter((s) => !(s.id === 1 && s.name.toLowerCase().includes("smith residence"))),
    [schedules],
  );
  const activeSchedules = useMemo(() => archiveSchedules.filter((s) => s.status === "active"), [archiveSchedules]);
  const archivedSchedules = useMemo(() => archiveSchedules.filter((s) => s.status === "archived"), [archiveSchedules]);
  const totals = useMemo(() => {
    const activityCount = activeSchedules.reduce((sum, s) => sum + (s.activityCount ?? 0), 0);
    const criticalCount = activeSchedules.reduce((sum, s) => sum + (s.criticalCount ?? 0), 0);
    const openEnds = activeSchedules.reduce((sum, s) => sum + (s.openStartCount ?? 0) + (s.openFinishCount ?? 0), 0);
    const relationshipCount = activeSchedules.reduce((sum, s) => sum + (s.relationshipCount ?? 0), 0);
    return { activityCount, criticalCount, openEnds, relationshipCount };
  }, [activeSchedules]);

  if (memberLoading || betaLoading) {
    return (
      <div className="min-h-screen bg-[#f6f0e4] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#c58a12]" />
      </div>
    );
  }

  if (!isAllowed) {
    return (
      <div className="min-h-screen bg-[#f6f0e4] flex items-center justify-center p-6">
        <Card className="max-w-md w-full border-[#1b1a17]/10 bg-[#fffaf0] shadow-xl">
          <CardContent className="p-8 text-center space-y-6">
            <Calendar className="w-16 h-16 text-[#c58a12] mx-auto" />
            <h1 className="text-2xl font-heading font-bold text-[#171512]">Baseline</h1>
            <p className="text-[#625a4b]">Sign in to open your CPM schedules, updates, and construction templates.</p>
            <a href={getLoginUrl("/portal/scheduler")}>
              <Button className="bg-[#171512] text-[#f7eddb] hover:bg-[#2a261f] w-full">
                Sign In with Discord
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f0e4] text-[#171512]">
      <div className="border-b border-[#171512]/10 bg-[#171512] text-[#f7eddb] sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <button
              onClick={() => setLocation("/portal/constructline")}
              className="p-2 rounded-md text-[#d8c9aa] hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Back to ConstructLine Hub"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-px h-9 bg-white/10" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#d9a21a] font-bold">ConstructLine Baseline</p>
              <h1 className="text-xl font-heading font-bold truncate">Schedule Desk</h1>
              <p className="text-sm text-[#d8c9aa] truncate">
                CPM schedules, updates, P6 imports, and delay-ready reporting.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              onClick={() => setShowXerImport(true)}
              className="border-[#d9a21a]/40 bg-white/5 text-[#f7eddb] hover:bg-[#d9a21a]/15 hover:text-white"
            >
              <FileUp className="w-4 h-4 mr-2" />
              Import P6 XER
            </Button>
            <Button
              onClick={() => setShowCreate(true)}
              className="bg-[#d9a21a] text-[#171512] hover:bg-[#e3b23c] font-semibold"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Schedule
            </Button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-5 py-5 space-y-5">
        <section className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <MetricTile label="Active schedules" value={activeSchedules.length} icon={LayoutGrid} />
          <MetricTile label="Activities planned" value={totals.activityCount} icon={Calendar} />
          <MetricTile label="Critical activities" value={totals.criticalCount} icon={Target} tone="gold" />
          <MetricTile label="Logic items to review" value={totals.openEnds} icon={AlertTriangle} tone={totals.openEnds ? "gold" : "green"} />
        </section>

        {schedulesQuery.isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#c58a12]" />
          </div>
        ) : activeSchedules.length === 0 && archivedSchedules.length === 0 ? (
          <section className="rounded-lg border border-[#171512]/10 bg-[#fffaf0] p-10 text-center shadow-sm">
            <Calendar className="w-14 h-14 text-[#c58a12] mx-auto mb-5" />
            <h2 className="text-2xl font-heading font-bold mb-3">Start your first Baseline schedule</h2>
            <p className="text-[#625a4b] mb-7 max-w-xl mx-auto">
              Build from a construction template, start blank, or import a Primavera P6 XER file and keep working from the same CPM cockpit.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button onClick={() => setShowCreate(true)} className="bg-[#171512] text-[#f7eddb] hover:bg-[#2a261f]">
                <Plus className="w-4 h-4 mr-2" />
                Create Schedule
              </Button>
              <Button variant="outline" onClick={() => setShowXerImport(true)} className="border-[#171512]/20">
                <Upload className="w-4 h-4 mr-2" />
                Import XER
              </Button>
            </div>
          </section>
        ) : (
          <>
            <section className="rounded-lg border border-[#171512]/10 bg-[#fffaf0] px-4 py-3 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#171512] text-[#d9a21a]">
                    <SlidersHorizontal className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8a6a12]">Update controls</p>
                    <p className="truncate text-sm text-[#625a4b]">Set data date, calculate CPM, review logic, save the update, then report.</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#625a4b]">
                  <WorkflowChip icon={Calendar} label="Data date" />
                  <WorkflowChip icon={AlertTriangle} label="Logic review" />
                  <WorkflowChip icon={Copy} label="Duplicate update" />
                  <Button onClick={() => setShowCreate(true)} size="sm" className="h-8 bg-[#171512] text-[#f7eddb] hover:bg-[#2a261f]">
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    New
                  </Button>
                </div>
              </div>
            </section>

            <section>
              <div className="flex items-end justify-between mb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-[#8a6a12]">Schedule archive</p>
                  <h2 className="text-xl font-heading font-bold">Active Baseline schedules</h2>
                </div>
                <p className="text-sm text-[#625a4b]">{activeSchedules.length} active, {archivedSchedules.length} archived</p>
              </div>
              {activeSchedules.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {activeSchedules.map((s) => (
                    <ScheduleCard
                      key={s.id}
                      schedule={s}
                      onOpen={() => window.open(`/scheduler/${s.id}`, "_blank")}
                      onDuplicate={() => {
                        setShowDuplicate(s.id);
                        setDuplicateName(`${s.name} - Update`);
                        setDuplicateDataDate(new Date().toISOString().slice(0, 10));
                      }}
                      onArchive={() => archiveMutation.mutate({ id: s.id, status: "archived" })}
                      onDelete={() => {
                        if (confirm("Are you sure you want to permanently delete this schedule?")) {
                          deleteMutation.mutate({ id: s.id });
                        }
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-[#171512]/20 bg-[#fffaf0] p-8 text-center text-[#625a4b]">
                  No active schedules. Restore one from the archive or create a new Baseline schedule.
                </div>
              )}
            </section>

            <section>
              <div className="flex items-end justify-between mb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-[#8a6a12]">Starting points</p>
                  <h2 className="text-xl font-heading font-bold">Construction templates</h2>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <TemplateCard
                  title="Smith Residence"
                  description="Residential CPM example with WBS, submittals, fabrication, construction phases, and a critical path."
                  meta="70+ activities"
                  onClick={() => window.open("/scheduler/1", "_blank")}
                  featured
                />
                {templates.slice(0, 2).map((template: any) => (
                  <TemplateCard
                    key={template.id}
                    title={template.name}
                    description={template.description}
                    meta={`${template.activityCount} activities${template.wbsNodeCount ? `, ${template.wbsNodeCount} WBS nodes` : ""}`}
                    onClick={() => {
                      setSelectedTemplate(template.id);
                      setNewName(template.name.replace(/ template/i, ""));
                      setShowCreate(true);
                    }}
                  />
                ))}
              </div>
            </section>

            {archivedSchedules.length > 0 && (
              <section>
                <h2 className="text-lg font-heading font-semibold text-[#625a4b] mb-4">Archived schedules</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 opacity-80">
                  {archivedSchedules.map((s) => (
                    <ScheduleCard
                      key={s.id}
                      schedule={s}
                      onOpen={() => window.open(`/scheduler/${s.id}`, "_blank")}
                      onDuplicate={() => {
                        setShowDuplicate(s.id);
                        setDuplicateName(`${s.name} - Update`);
                        setDuplicateDataDate(new Date().toISOString().slice(0, 10));
                      }}
                      onArchive={() => archiveMutation.mutate({ id: s.id, status: "active" })}
                      onDelete={() => {
                        if (confirm("Are you sure you want to permanently delete this schedule?")) {
                          deleteMutation.mutate({ id: s.id });
                        }
                      }}
                      isArchived
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <CreateScheduleDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        newName={newName}
        setNewName={setNewName}
        newDesc={newDesc}
        setNewDesc={setNewDesc}
        newStartDate={newStartDate}
        setNewStartDate={setNewStartDate}
        selectedTemplate={selectedTemplate}
        setSelectedTemplate={setSelectedTemplate}
        templates={templates}
        isPending={createMutation.isPending}
        onCreate={() =>
          createMutation.mutate({
            name: newName,
            description: newDesc || undefined,
            projectStartDate: new Date(`${newStartDate}T00:00:00`),
            templateId: selectedTemplate || undefined,
          })
        }
      />

      <Dialog open={showDuplicate !== null} onOpenChange={() => setShowDuplicate(null)}>
        <DialogContent className="bg-[#fffaf0] border-[#171512]/10 max-w-xl text-base">
          <DialogHeader>
            <DialogTitle className="font-heading">Duplicate Schedule as Update</DialogTitle>
            <DialogDescription>
              Create a full copy with activities, logic, WBS, resources, annotations, and layouts. Set the new data date for the update period.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>New Schedule Name</Label>
              <Input value={duplicateName} onChange={(e) => setDuplicateName(e.target.value)} className="mt-1" autoFocus />
            </div>
            <div>
              <Label>New Data Date</Label>
              <Input type="date" value={duplicateDataDate} onChange={(e) => setDuplicateDataDate(e.target.value)} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDuplicate(null)}>Cancel</Button>
            <Button
              onClick={() =>
                showDuplicate &&
                duplicateMutation.mutate({
                  id: showDuplicate,
                  name: duplicateName,
                  dataDate: duplicateDataDate ? new Date(`${duplicateDataDate}T00:00:00`) : undefined,
                })
              }
              disabled={!duplicateName.trim() || duplicateMutation.isPending}
              className="bg-[#171512] text-[#f7eddb] hover:bg-[#2a261f]"
            >
              {duplicateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Duplicate and Open
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <XerImportDialog
        open={showXerImport}
        onOpenChange={(open) => {
          setShowXerImport(open);
          if (!open) {
            setXerFile(null);
            setXerScheduleName("");
          }
        }}
        file={xerFile}
        setFile={setXerFile}
        scheduleName={xerScheduleName}
        setScheduleName={setXerScheduleName}
        importing={xerImporting}
        progress={xerProgress}
        onImport={handleXerImport}
      />
    </div>
  );
}

function MetricTile({
  label,
  value,
  icon: Icon,
  tone = "dark",
}: {
  label: string;
  value: number;
  icon: any;
  tone?: "dark" | "gold" | "green" | "red";
}) {
  const color =
    tone === "gold"
      ? "text-[#8a6a12] bg-[#d9a21a]/15"
      : tone === "green"
        ? "text-emerald-700 bg-emerald-600/10"
        : tone === "red"
          ? "text-red-700 bg-red-600/10"
          : "text-[#171512] bg-[#171512]/5";

  return (
    <div className="rounded-lg border border-[#171512]/10 bg-[#fffaf0] p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#625a4b]">{label}</p>
          <p className="text-2xl font-heading font-bold mt-1">{value.toLocaleString()}</p>
        </div>
        <div className={`h-10 w-10 rounded-md flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function WorkflowChip({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <span className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#171512]/10 bg-[#f6f0e4] px-3 font-semibold text-[#625a4b]">
      <Icon className="h-3.5 w-3.5 text-[#8a6a12]" />
      {label}
    </span>
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
  schedule: ScheduleSummary;
  onOpen: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
  isArchived?: boolean;
}) {
  const status = getScheduleStatus(schedule);
  const completion = pct(schedule.completedCount, schedule.activityCount);
  const openEnds = (schedule.openStartCount ?? 0) + (schedule.openFinishCount ?? 0);

  return (
    <Card className="group cursor-pointer overflow-hidden border-[#171512]/10 bg-[#fffaf0] shadow-sm transition-all hover:border-[#d9a21a]/50 hover:shadow-md" onClick={onOpen}>
      <CardContent className="p-0">
        <div className="flex items-start justify-between gap-4 border-b border-[#171512]/10 p-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-heading text-lg font-bold text-[#171512] truncate">{schedule.name}</h3>
              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ${statusClasses(status.tone)}`}>
                {status.label}
              </span>
            </div>
            {schedule.description && <p className="mt-1 truncate text-sm text-[#625a4b]">{schedule.description}</p>}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="rounded-md p-1.5 text-[#625a4b] opacity-0 transition-colors hover:bg-[#171512]/5 hover:text-[#171512] group-hover:opacity-100"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={onOpen}>
                <FolderOpen className="w-4 h-4 mr-2" />
                Open Cockpit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="w-4 h-4 mr-2" />
                Duplicate as Update
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onArchive}>
                <Archive className="w-4 h-4 mr-2" />
                {isArchived ? "Restore" : "Archive"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 border-b border-[#171512]/10">
          <CardStat label="Activities" value={(schedule.activityCount ?? 0).toLocaleString()} />
          <CardStat label="Critical" value={(schedule.criticalCount ?? 0).toLocaleString()} tone={schedule.criticalCount ? "gold" : undefined} />
          <CardStat label="Logic review" value={openEnds.toLocaleString()} tone={openEnds ? "gold" : "green"} />
          <CardStat label="Complete" value={`${completion}%`} tone={completion >= 100 ? "green" : undefined} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 p-4 text-xs text-[#625a4b]">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Start {formatDate(schedule.projectStartDate, { month: "short", day: "numeric", year: "numeric" })}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Data date {formatDate(schedule.dataDate, { month: "short", day: "numeric" })}
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Finish {formatDate(schedule.projectFinish, { month: "short", day: "numeric" })}
            </span>
          </div>
          <span className="font-semibold text-[#8a6a12]">Open Baseline</span>
        </div>
      </CardContent>
    </Card>
  );
}

function CardStat({ label, value, tone }: { label: string; value: string; tone?: "gold" | "green" | "red" }) {
  const color = tone === "gold" ? "text-[#8a6a12]" : tone === "green" ? "text-emerald-700" : tone === "red" ? "text-red-700" : "text-[#171512]";
  return (
    <div className="border-r border-[#171512]/10 p-3 last:border-r-0">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8b806f]">{label}</p>
      <p className={`mt-1 text-lg font-heading font-bold ${color}`}>{value}</p>
    </div>
  );
}

function TemplateCard({
  title,
  description,
  meta,
  onClick,
  featured,
}: {
  title: string;
  description: string;
  meta: string;
  onClick: () => void;
  featured?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-lg border p-5 shadow-sm transition-all hover:shadow-md ${
        featured ? "border-emerald-600/25 bg-emerald-700/10" : "border-[#171512]/10 bg-[#fffaf0]"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-heading font-bold text-[#171512]">{title}</h3>
        <span className="rounded-full bg-[#171512]/5 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#625a4b]">{meta}</span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-[#625a4b]">{description}</p>
    </button>
  );
}

function CreateScheduleDialog({
  open,
  onOpenChange,
  newName,
  setNewName,
  newDesc,
  setNewDesc,
  newStartDate,
  setNewStartDate,
  selectedTemplate,
  setSelectedTemplate,
  templates,
  isPending,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newName: string;
  setNewName: (value: string) => void;
  newDesc: string;
  setNewDesc: (value: string) => void;
  newStartDate: string;
  setNewStartDate: (value: string) => void;
  selectedTemplate: string | null;
  setSelectedTemplate: (value: string | null) => void;
  templates: any[];
  isPending: boolean;
  onCreate: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#fffaf0] border-[#171512]/10 max-w-2xl text-base max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="font-heading">Create Baseline Schedule</DialogTitle>
          <DialogDescription>Name the project, choose the start date, and pick a construction starting point.</DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 pr-1 space-y-5 py-2">
          <div className="space-y-3">
            <div>
              <Label>Project Name</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Smith Residence - New Build" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Description</Label>
                <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Brief project description" className="mt-1" />
              </div>
              <div>
                <Label>Project Start Date</Label>
                <Input type="date" value={newStartDate} onChange={(e) => setNewStartDate(e.target.value)} className="mt-1" />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-[#171512]/10 bg-[#f6f0e4] p-4">
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#8a6a12]">Choose a starting point</p>
            <div className="mt-3 grid grid-cols-1 gap-2">
              <button
                onClick={() => setSelectedTemplate(null)}
                className={`rounded-md border p-3 text-left transition-all ${
                  selectedTemplate === null ? "border-[#d9a21a] bg-[#d9a21a]/10" : "border-[#171512]/10 bg-[#fffaf0] hover:border-[#d9a21a]/40"
                }`}
              >
                <div className="font-semibold">Blank Schedule</div>
                <div className="text-xs text-[#625a4b]">Start with an empty CPM file and add your own activities.</div>
              </button>

              <div className="grid grid-cols-2 gap-2">
                {templates.map((template: any) => {
                  const isSelected = selectedTemplate === template.id;
                  return (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template.id)}
                      className={`rounded-md border p-3 text-left transition-all ${
                        isSelected ? "border-[#d9a21a] bg-[#d9a21a]/10" : "border-[#171512]/10 bg-[#fffaf0] hover:border-emerald-700/30"
                      }`}
                    >
                      <div className="font-semibold leading-tight">{template.name}</div>
                      <div className="mt-1 line-clamp-2 text-xs text-[#625a4b]">{template.description}</div>
                      <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-700">
                        {template.activityCount} activities
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t border-[#171512]/10 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onCreate} disabled={!newName.trim() || isPending} className="bg-[#171512] text-[#f7eddb] hover:bg-[#2a261f]">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Create Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function XerImportDialog({
  open,
  onOpenChange,
  file,
  setFile,
  scheduleName,
  setScheduleName,
  importing,
  progress,
  onImport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: File | null;
  setFile: (file: File | null) => void;
  scheduleName: string;
  setScheduleName: (value: string) => void;
  importing: boolean;
  progress: string;
  onImport: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#fffaf0] border-[#171512]/10 max-w-2xl text-base">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">Import Primavera P6 XER File</DialogTitle>
          <DialogDescription>
            Upload an XER export. Baseline will import activities, relationships, WBS, calendars, constraints, and milestones.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div
            className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
              file ? "border-[#d9a21a] bg-[#d9a21a]/10" : "border-[#171512]/20 hover:border-[#d9a21a]/60"
            }`}
            onClick={() => document.getElementById("xer-file-input")?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const dropped = e.dataTransfer.files[0];
              if (dropped && dropped.name.toLowerCase().endsWith(".xer")) {
                setFile(dropped);
                if (!scheduleName) setScheduleName(dropped.name.replace(/\.xer$/i, ""));
              } else {
                toast.error("Please upload an XER file");
              }
            }}
          >
            <input
              id="xer-file-input"
              type="file"
              accept=".xer,.XER"
              className="hidden"
              onChange={(e) => {
                const selected = e.target.files?.[0];
                if (selected) {
                  setFile(selected);
                  if (!scheduleName) setScheduleName(selected.name.replace(/\.xer$/i, ""));
                }
              }}
            />
            {file ? (
              <div className="space-y-2">
                <FileUp className="w-10 h-10 text-[#8a6a12] mx-auto" />
                <p className="font-medium text-[#171512]">{file.name}</p>
                <p className="text-sm text-[#625a4b]">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-10 h-10 text-[#625a4b] mx-auto" />
                <p className="font-medium text-[#171512]">Drop your XER file here</p>
                <p className="text-sm text-[#625a4b]">or click to browse</p>
              </div>
            )}
          </div>

          <div>
            <Label>Schedule Name</Label>
            <Input value={scheduleName} onChange={(e) => setScheduleName(e.target.value)} placeholder="Leave blank to use P6 project name" className="mt-1" />
          </div>

          <div className="rounded-lg bg-[#f6f0e4] p-4 text-sm text-[#625a4b]">
            <p className="font-semibold text-[#171512]">Imported schedules open directly in the Baseline cockpit.</p>
            <p className="mt-1">After import, calculate CPM, verify open ends, then save your first baseline snapshot before issuing the update.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onImport} disabled={!file || importing} className="bg-[#171512] text-[#f7eddb] hover:bg-[#2a261f]">
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                {progress || "Importing..."}
              </>
            ) : (
              <>
                <FileUp className="w-4 h-4 mr-2" />
                Import Schedule
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
