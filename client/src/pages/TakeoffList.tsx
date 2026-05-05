/**
 * TakeoffList — Bid Desk project archive for Basis estimates.
 * Members can create new projects, view existing ones, and see status.
 */
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Layers,
  MapPin,
  DollarSign,
  Target,
  Search,
  SlidersHorizontal,
  LayoutGrid,
  List,
  FolderOpen,
  BarChart3,
  MoreHorizontal,
  ArrowUpDown,
  X,
  Database,
  HardHat,
} from "lucide-react";
import { getBidModeBehavior } from "../../../shared/bidMode";

const LIGHT_OUTLINE_BUTTON_CLASS =
  "border-[#c8b895] bg-white/70 text-[#29251c] hover:!bg-[#faf8f2] hover:!text-[#171714] active:!bg-[#f1eee6] active:!text-[#171714] focus-visible:!text-[#171714]";

const SORT_OPTIONS = [
  { id: "updated", label: "Last Updated" },
  { id: "value", label: "Bid Value" },
  { id: "name", label: "Project Name" },
  { id: "sheets", label: "Sheet Count" },
] as const;

const BID_MODE_OPTIONS = [
  { id: "all", label: "All bid modes" },
  { id: "full_gc", label: "Full GC" },
  { id: "trade_package", label: "Trade Package" },
  { id: "fast_scope_check", label: "Fast Scope Check" },
] as const;

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: any }
> = {
  draft: {
    label: "Draft",
    color: "bg-white text-[#716855] border-[#d7c7aa]",
    icon: FileText,
  },
  uploading: {
    label: "Uploading",
    color: "bg-blue-50 text-[#244c91] border-blue-200",
    icon: Upload,
  },
  processing: {
    label: "Processing",
    color: "bg-[#fff4cb] text-[#8a6510] border-[#d7b44d]",
    icon: Loader2,
  },
  completed: {
    label: "Completed",
    color: "bg-emerald-50 text-emerald-800 border-emerald-300",
    icon: CheckCircle2,
  },
  error: {
    label: "Error",
    color: "bg-orange-50 text-orange-800 border-orange-300",
    icon: AlertCircle,
  },
};

function formatCurrency(cents: number, currencyCode: string = "USD"): string {
  const locale =
    currencyCode === "GBP"
      ? "en-GB"
      : currencyCode === "AUD"
        ? "en-AU"
        : "en-US";
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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "completed" | "processing" | "draft"
  >("all");
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] =
    useState<(typeof SORT_OPTIONS)[number]["id"]>("updated");
  const [bidModeFilter, setBidModeFilter] =
    useState<(typeof BID_MODE_OPTIONS)[number]["id"]>("all");
  const [regionFilter, setRegionFilter] = useState("all");

  const {
    data: projects,
    isLoading,
    refetch,
  } = trpc.takeoff.listProjects.useQuery();
  const createMutation = trpc.takeoff.createProject.useMutation({
    onSuccess: result => {
      toast.success("Project created! Upload your drawings and click Analyze.");
      setShowCreate(false);
      setNewName("");
      setNewDesc("");
      navigate(`/takeoff/${result.id}`);
    },
    onError: err => toast.error(err.message),
  });
  const deleteMutation = trpc.takeoff.deleteProject.useMutation({
    onSuccess: () => {
      toast.success("Project deleted");
      setDeleteId(null);
      refetch();
    },
    onError: err => toast.error(err.message),
  });
  const handleCreate = () => {
    createMutation.mutate({
      name: newName,
      description: newDesc || undefined,
    });
  };

  const projectList = projects || [];
  const regionOptions = useMemo(() => {
    const regions = projectList
      .map((project: any) => project.costRegion)
      .filter((region: string | null | undefined): region is string =>
        Boolean(region)
      );
    return Array.from(new Set(regions)).sort((a, b) => a.localeCompare(b));
  }, [projectList]);
  const filtersActive = bidModeFilter !== "all" || regionFilter !== "all";
  const selectedSortLabel =
    SORT_OPTIONS.find(option => option.id === sortBy)?.label || "Last Updated";
  const filteredProjects = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return projectList.filter((project: any) => {
      const matchesSearch =
        !normalizedSearch ||
        project.name?.toLowerCase().includes(normalizedSearch) ||
        project.description?.toLowerCase().includes(normalizedSearch) ||
        project.costRegion?.toLowerCase().includes(normalizedSearch);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "completed" && project.status === "completed") ||
        (statusFilter === "processing" &&
          ["uploading", "processing", "error"].includes(project.status)) ||
        (statusFilter === "draft" && project.status === "draft");
      const matchesBidMode =
        bidModeFilter === "all" || project.bidMode === bidModeFilter;
      const matchesRegion =
        regionFilter === "all" || project.costRegion === regionFilter;
      return matchesSearch && matchesStatus && matchesBidMode && matchesRegion;
    });
  }, [bidModeFilter, projectList, regionFilter, search, statusFilter]);
  const visibleProjects = useMemo(() => {
    return [...filteredProjects].sort((a: any, b: any) => {
      if (sortBy === "value")
        return (b.totalEstimatedCost || 0) - (a.totalEstimatedCost || 0);
      if (sortBy === "name")
        return String(a.name || "").localeCompare(String(b.name || ""));
      if (sortBy === "sheets")
        return (b.totalSheets || 0) - (a.totalSheets || 0);

      const bDate = new Date(b.updatedAt || b.createdAt || 0).getTime();
      const aDate = new Date(a.updatedAt || a.createdAt || 0).getTime();
      return bDate - aDate;
    });
  }, [filteredProjects, sortBy]);
  const clearProjectControls = () => {
    setSortBy("updated");
    setBidModeFilter("all");
    setRegionFilter("all");
  };
  const completedCount = projectList.filter(
    (project: any) => project.status === "completed"
  ).length;
  const inProgressCount = projectList.filter((project: any) =>
    ["uploading", "processing", "error"].includes(project.status)
  ).length;
  const draftCount = projectList.filter(
    (project: any) => project.status === "draft"
  ).length;
  const totalBidValue = projectList.reduce(
    (sum: number, project: any) => sum + (project.totalEstimatedCost || 0),
    0
  );
  const avgBidValue =
    projectList.length > 0 ? Math.round(totalBidValue / projectList.length) : 0;
  const statCards = [
    {
      label: "Total Projects",
      value: String(projectList.length),
      detail: "All time",
      icon: FolderOpen,
      tone: "amber",
    },
    {
      label: "Completed",
      value: String(completedCount),
      detail: `${projectList.length ? Math.round((completedCount / projectList.length) * 100) : 0}% of total`,
      icon: CheckCircle2,
      tone: "green",
    },
    {
      label: "In Progress",
      value: String(inProgressCount),
      detail: `${projectList.length ? Math.round((inProgressCount / projectList.length) * 100) : 0}% of total`,
      icon: Loader2,
      tone: "blue",
    },
    {
      label: "Drafts",
      value: String(draftCount),
      detail: `${projectList.length ? Math.round((draftCount / projectList.length) * 100) : 0}% of total`,
      icon: FileText,
      tone: "gray",
    },
    {
      label: "Total Bid Value",
      value: formatCurrency(totalBidValue),
      detail: "Across all projects",
      icon: DollarSign,
      tone: "green",
    },
    {
      label: "Avg. Bid Value",
      value: formatCurrency(avgBidValue),
      detail: "Per project",
      icon: BarChart3,
      tone: "amber",
    },
  ];
  const filterTabs: Array<{ id: typeof statusFilter; label: string }> = [
    { id: "all", label: "All" },
    { id: "completed", label: "Completed" },
    { id: "processing", label: "In Progress" },
    { id: "draft", label: "Drafts" },
  ];

  return (
    <div className="-m-6 min-h-screen space-y-7 bg-[#f5f2eb] px-6 py-7 text-[#171714]">
      {/* Header */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="flex items-center gap-4">
            {/* ConstructLine Brand Mark */}
            <div className="flex flex-col">
              <span className="text-2xl font-bold tracking-tight text-[#171714] leading-tight">
                Construct<span className="text-[#d9a21a]">Line</span> Basis
              </span>
              <span className="text-[9px] text-[#8a806d] tracking-wider uppercase leading-tight">
                Powered by ALP
              </span>
            </div>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-[#716855]">
            Bid Desk keeps every estimating project in one place. Track
            progress, manage bid readiness, and open the right estimate fast.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-[260px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a806d]" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search projects..."
              className="h-10 rounded-xl border-[#d7c7aa] bg-white pl-9 text-[#171714] shadow-sm placeholder:text-[#8a806d]"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(open => !open)}
            className={`h-10 rounded-xl shadow-sm ${
              showFilters || filtersActive
                ? "border-[#d7b44d] bg-[#fff4cb] text-[#8a6510] hover:!bg-[#fff4cb] hover:!text-[#171714] active:!bg-[#f7e8ad] active:!text-[#171714]"
                : LIGHT_OUTLINE_BUTTON_CLASS
            }`}
          >
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Filters
          </Button>
          <div className="flex rounded-xl border border-[#d7c7aa] bg-white p-1 shadow-sm">
            <Button
              size="sm"
              variant="ghost"
              aria-label="Show projects as cards"
              onClick={() => setViewMode("grid")}
              className={`h-8 w-8 rounded-lg p-0 ${
                viewMode === "grid"
                  ? "bg-[#fff4cb] text-[#8a6510] hover:!bg-[#fff4cb] hover:!text-[#171714]"
                  : "text-[#716855] hover:!bg-[#faf8f2] hover:!text-[#171714]"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              aria-label="Show projects as a list"
              onClick={() => setViewMode("list")}
              className={`h-8 w-8 rounded-lg p-0 ${
                viewMode === "list"
                  ? "bg-[#fff4cb] text-[#8a6510] hover:!bg-[#fff4cb] hover:!text-[#171714]"
                  : "text-[#716855] hover:!bg-[#faf8f2] hover:!text-[#171714]"
              }`}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button
            data-tour="takeoff-new-project"
            onClick={() => setShowCreate(true)}
            className="h-10 rounded-xl bg-[#d18400] px-5 font-semibold text-white shadow-[0_18px_45px_rgba(209,132,0,0.24)] hover:bg-[#b86f00]"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Bid
          </Button>
        </div>
      </div>

      <section
        data-tour="basis-pricing-libraries"
        className="rounded-2xl border border-[#d7b44d] bg-[#fff8df] p-4 shadow-[0_18px_55px_rgba(138,101,16,0.10)]"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8a6510]">
              Before the first real bid
            </p>
            <h2 className="mt-1 text-lg font-semibold text-[#171714]">
              Basis prices from your Cost Library and Trade Rate Library.
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-[#716855]">
              ConstructLine gives contractors a strong default starting point,
              but users should quickly review material unit costs, burdened
              rates, and crews so estimates reflect how they actually buy and
              build.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/portal/cost-library")}
              className="h-10 rounded-xl border-[#d7c7aa] bg-white text-[#29251c] hover:!bg-[#faf8f2]"
            >
              <Database className="mr-2 h-4 w-4 text-[#8a6510]" />
              Cost Library
            </Button>
            <Button
              type="button"
              onClick={() => navigate("/portal/labor-library?tab=crews")}
              className="h-10 rounded-xl bg-[#171714] text-white hover:bg-[#29251c]"
            >
              <HardHat className="mr-2 h-4 w-4" />
              Trade Rate Library
            </Button>
          </div>
        </div>
      </section>

      {showFilters && (
        <div className="rounded-2xl border border-[#e0d2b7] bg-white/90 p-4 shadow-[0_18px_55px_rgba(41,37,28,0.09)]">
          <div className="flex flex-col gap-2 border-b border-[#eadcc4] pb-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8a6510]">
                Project Controls
              </p>
              <p className="text-sm text-[#716855]">
                Showing{" "}
                <span className="font-semibold text-[#171714]">
                  {visibleProjects.length}
                </span>{" "}
                of {projectList.length} bid projects.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearProjectControls}
              disabled={!filtersActive && sortBy === "updated"}
              className={`${LIGHT_OUTLINE_BUTTON_CLASS} h-9 rounded-xl disabled:opacity-50`}
            >
              <X className="mr-2 h-4 w-4" />
              Clear
            </Button>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.2fr_1fr]">
            <div>
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#716855]">
                <ArrowUpDown className="h-3.5 w-3.5" />
                Sort
              </p>
              <div className="flex flex-wrap gap-2">
                {SORT_OPTIONS.map(option => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setSortBy(option.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      sortBy === option.id
                        ? "border-[#d7b44d] bg-[#fff4cb] text-[#8a6510]"
                        : "border-[#d7c7aa] bg-white text-[#5d5546] hover:bg-[#faf8f2] hover:text-[#171714]"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#716855]">
                Bid Mode
              </p>
              <div className="flex flex-wrap gap-2">
                {BID_MODE_OPTIONS.map(option => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setBidModeFilter(option.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      bidModeFilter === option.id
                        ? "border-[#d7b44d] bg-[#fff4cb] text-[#8a6510]"
                        : "border-[#d7c7aa] bg-white text-[#5d5546] hover:bg-[#faf8f2] hover:text-[#171714]"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#716855]">
                Region
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setRegionFilter("all")}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    regionFilter === "all"
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                      : "border-[#d7c7aa] bg-white text-[#5d5546] hover:bg-[#faf8f2] hover:text-[#171714]"
                  }`}
                >
                  All regions
                </button>
                {regionOptions.map(region => (
                  <button
                    key={region}
                    type="button"
                    onClick={() => setRegionFilter(region)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      regionFilter === region
                        ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                        : "border-[#d7c7aa] bg-white text-[#5d5546] hover:bg-[#faf8f2] hover:text-[#171714]"
                    }`}
                  >
                    {region}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {statCards.map(stat => {
          const Icon = stat.icon;
          const toneClass =
            stat.tone === "green"
              ? "bg-emerald-50 text-emerald-800"
              : stat.tone === "blue"
                ? "bg-blue-50 text-[#244c91]"
                : stat.tone === "amber"
                  ? "bg-[#fff4cb] text-[#8a6510]"
                  : "bg-[#f1eee6] text-[#716855]";
          return (
            <div
              key={stat.label}
              className="rounded-xl border border-[#e3d6bd] bg-white/88 p-4 shadow-[0_18px_44px_rgba(41,37,28,0.07)]"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneClass}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-[#716855]">
                    {stat.label}
                  </p>
                  <p className="truncate font-mono text-xl font-semibold text-[#171714]">
                    {stat.value}
                  </p>
                  <p className="text-[11px] text-[#8a806d]">{stat.detail}</p>
                </div>
              </div>
            </div>
          );
        })}
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
            <h3 className="text-lg font-semibold text-[#171714] mb-2">
              No Basis Projects Yet
            </h3>
            <p className="text-[#716855] text-center max-w-md mb-6">
              Create your first bid, upload construction drawings, and let Basis
              build the scope, estimate, and submit package from the drawing
              set.
            </p>
            <Button
              onClick={() => setShowCreate(true)}
              className="bg-[#171714] text-white hover:bg-[#29251c]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First Bid
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-col gap-3 border-b border-[#d7c7aa] pb-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#171714]">
                All Projects
              </h2>
              <div className="mt-2 flex flex-wrap gap-5">
                {filterTabs.map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
                    className={`border-b-2 pb-2 text-sm font-medium transition-colors ${
                      statusFilter === tab.id
                        ? "border-[#d18400] text-[#8a6510]"
                        : "border-transparent text-[#716855] hover:text-[#171714]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-sm text-[#716855]">
              Sort by:{" "}
              <span className="font-semibold text-[#171714]">
                {selectedSortLabel}
              </span>
            </div>
          </div>
          <div
            data-tour="takeoff-project-grid"
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 gap-4 xl:grid-cols-3"
                : "space-y-3"
            }
          >
            {visibleProjects.length === 0 && (
              <Card className="border-[#e0d2b7] bg-white/82 shadow-[0_18px_50px_rgba(41,37,28,0.08)] xl:col-span-3">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-[#d7c7aa] bg-[#faf8f2] text-[#716855]">
                    <Search className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-[#171714]">
                    No projects match these controls
                  </h3>
                  <p className="mt-1 max-w-md text-sm text-[#716855]">
                    Clear the filters or adjust the search to bring projects
                    back into view.
                  </p>
                </CardContent>
              </Card>
            )}
            {visibleProjects.map((project: any, index: number) => {
              const statusConfig =
                STATUS_CONFIG[project.status] || STATUS_CONFIG.draft;
              const StatusIcon = statusConfig.icon;
              // Parse selected divisions for display
              let divCount: number | null = null;
              try {
                if (project.selectedDivisions) {
                  const parsed = JSON.parse(project.selectedDivisions);
                  if (Array.isArray(parsed)) divCount = parsed.length;
                }
              } catch {
                /* ignore */
              }

              return (
                <Card
                  key={project.id}
                  className={`group cursor-pointer overflow-hidden border-[#e0d2b7] bg-white shadow-[0_18px_50px_rgba(41,37,28,0.08)] transition-all hover:-translate-y-0.5 hover:border-[#d7b44d] hover:shadow-[0_24px_70px_rgba(41,37,28,0.14)] ${
                    viewMode === "list" ? "rounded-xl" : ""
                  }`}
                  onClick={() => navigate(`/takeoff/${project.id}`)}
                >
                  <CardContent className="p-3">
                    <div
                      className={`flex gap-3 ${viewMode === "list" ? "items-center" : ""}`}
                    >
                      <div
                        className={`relative shrink-0 overflow-hidden rounded-lg border border-[#d7c7aa] bg-[#e9e2d4] ${
                          viewMode === "list" ? "h-20 w-24" : "h-28 w-28"
                        }`}
                      >
                        <div
                          className={`absolute inset-0 ${
                            index % 3 === 0
                              ? "bg-[linear-gradient(135deg,#e7d8bd_0%,#f8f5ed_55%,#cbd9d2_100%)]"
                              : index % 3 === 1
                                ? "bg-[linear-gradient(135deg,#d8e4df_0%,#f8f5ed_52%,#d8c6a4_100%)]"
                                : "bg-[linear-gradient(135deg,#d8dce5_0%,#f8f5ed_55%,#e4d0aa_100%)]"
                          }`}
                        />
                        <div className="absolute inset-x-4 bottom-4 top-7 rounded-sm border-2 border-white/80 bg-white/35 shadow-sm" />
                        <div className="absolute left-6 top-10 h-9 w-14 border border-[#8a806d]/35 bg-white/35" />
                        <div className="absolute right-5 top-8 h-14 w-5 border border-[#8a806d]/30 bg-white/30" />
                        <div className="absolute bottom-3 left-3 rounded bg-white/85 px-1.5 py-0.5 text-[9px] font-semibold text-[#716855]">
                          CL
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <Badge
                              className={`${statusConfig.color} mb-1 border text-[10px]`}
                            >
                              <StatusIcon
                                className={`mr-1 h-3 w-3 ${project.status === "processing" ? "animate-spin" : ""}`}
                              />
                              {statusConfig.label}
                            </Badge>
                            <CardTitle className="line-clamp-1 text-base text-[#171714] transition-colors group-hover:text-[#8a6510]">
                              {project.name}
                            </CardTitle>
                            <CardDescription className="mt-1 line-clamp-1 text-xs text-[#5d5546]">
                              {getBidModeBehavior(project.bidMode).shortLabel}
                              {project.costRegion
                                ? ` • ${project.costRegion}`
                                : " • All regions"}
                            </CardDescription>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 shrink-0 p-0 text-[#716855] hover:!bg-[#faf8f2] hover:!text-[#171714] active:!bg-[#f1eee6] active:!text-[#171714]"
                                onClick={e => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-44 border-[#d7c7aa] bg-white text-[#171714] shadow-[0_18px_44px_rgba(41,37,28,0.18)]"
                              onClick={e => e.stopPropagation()}
                            >
                              <DropdownMenuItem
                                className="cursor-pointer text-[#29251c] focus:bg-[#faf8f2] focus:text-[#171714]"
                                onClick={() =>
                                  navigate(`/takeoff/${project.id}`)
                                }
                              >
                                <ArrowRight className="mr-2 h-4 w-4" />
                                Open project
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-[#eadcc4]" />
                              <DropdownMenuItem
                                className="cursor-pointer text-orange-800 focus:bg-orange-50 focus:text-orange-900"
                                onClick={() => setDeleteId(project.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#716855]">
                          <span className="flex items-center gap-1">
                            <FileStack className="h-3.5 w-3.5" />
                            {project.totalSheets} sheets
                          </span>
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                            {project.processedSheets || 0} done
                          </span>
                        </div>
                        <div className="mt-3 flex items-end justify-between gap-3">
                          <span className="text-xs text-[#716855]">
                            Updated{" "}
                            {new Date(
                              project.updatedAt || project.createdAt
                            ).toLocaleDateString()}
                          </span>
                          <div className="text-right">
                            {project.totalEstimatedCost > 0 && (
                              <p className="font-mono text-base font-bold text-emerald-800">
                                {formatCurrency(
                                  project.totalEstimatedCost,
                                  project.currency || "USD"
                                )}
                              </p>
                            )}
                            <ArrowRight className="ml-auto mt-1 h-4 w-4 text-[#8a6510] transition-transform group-hover:translate-x-0.5" />
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Division, Region & Currency badges */}
                    <div className="mt-3 flex items-center gap-2 flex-wrap border-t border-[#eadcc4] pt-3">
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
                          {project.costMultiplier &&
                            ` (${(project.costMultiplier / 10000).toFixed(2)}x)`}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            <Card
              className={`flex cursor-pointer items-center justify-center border-dashed border-[#d7b44d] bg-white/55 shadow-[0_18px_50px_rgba(41,37,28,0.06)] transition-all hover:-translate-y-0.5 hover:bg-white ${
                viewMode === "grid" ? "min-h-[172px]" : "min-h-[96px]"
              }`}
              onClick={() => setShowCreate(true)}
            >
              <CardContent
                className={`flex items-center justify-center p-6 text-center ${
                  viewMode === "grid" ? "flex-col" : "gap-4 text-left"
                }`}
              >
                <div
                  className={`${viewMode === "grid" ? "mb-3" : ""} flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#d7b44d] bg-[#fff4cb] text-[#8a6510]`}
                >
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#171714]">
                    Create New Bid
                  </h3>
                  <p className="mt-1 text-xs text-[#716855]">
                    Upload drawings and start a new bid.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Create Dialog — simplified: just name + description */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="border-[#d7c7aa] bg-[#f4efe4] text-[#171714] shadow-[0_32px_90px_rgba(41,37,28,0.34)] [&_[data-slot=dialog-header]]:border-[#d8c9ad] [&_[data-slot=dialog-footer]]:border-[#d8c9ad] [&_[data-slot=dialog-close]]:text-[#716855] [&_[data-slot=dialog-close]]:hover:bg-white [&_[data-slot=dialog-close]]:hover:text-[#171714]">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#171714]">
              New Basis Project
            </DialogTitle>
            <DialogDescription className="text-[#716855]">
              Name your project, then upload drawings and click "Analyze" to
              choose the bid mode, scope boundary, currency, and regional
              pricing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {/* Project Name */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-[#171714]">
                Project Name
              </Label>
              <Input
                placeholder="e.g. Smith Residence Bid"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                autoFocus
                className="border-[#d7c7aa] bg-white text-[#171714] placeholder:text-[#8a806d]"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-sm text-[#716855]">
                Description (optional)
              </Label>
              <Textarea
                placeholder="Brief description of the project..."
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                rows={2}
                className="resize-none border-[#d7c7aa] bg-white text-[#171714] placeholder:text-[#8a806d]"
              />
            </div>

            {/* Helpful hint */}
            <div className="flex items-start gap-2 rounded-lg border border-[#d7b44d] bg-[#fff7da] p-3">
              <Layers className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#8a6510]" />
              <p className="text-xs text-[#716855]">
                After creating your project, upload your construction drawings
                and click{" "}
                <strong className="text-[#8a6510]">"Analyze Drawings"</strong>.
                Start with Full GC Takeoff, Trade Package Takeoff, or Fast Scope
                Check so the review surface matches the bid.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreate(false)}
              className="border-[#c8b895] bg-white/70 text-[#29251c] hover:!bg-[#faf8f2] hover:!text-[#171714] active:!bg-[#f1eee6] active:!text-[#171714]"
            >
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
            <DialogTitle className="text-[#171714]">
              Delete Project?
            </DialogTitle>
            <DialogDescription className="text-[#716855]">
              This will permanently delete the project, all drawing sheets, and
              extracted quantities. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteId(null)}
              className="border-[#c8b895] bg-white/70 text-[#29251c] hover:!bg-[#faf8f2] hover:!text-[#171714] active:!bg-[#f1eee6] active:!text-[#171714]"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                deleteId && deleteMutation.mutate({ id: deleteId })
              }
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
