/**
 * Resource & Cost Loading Panel
 * Manages schedule resources, activity resource assignments, and cost accounts.
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Edit2,
  Users,
  DollarSign,
  Wrench,
  HardHat,
  Package,
  Hammer,
  Save,
  X,
} from "lucide-react";

interface ResourcePanelProps {
  scheduleId: number;
  activities: Array<{ id: number; activityId: string; name: string }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RESOURCE_TYPE_ICONS: Record<string, React.ReactNode> = {
  labor: <HardHat className="h-4 w-4" />,
  equipment: <Wrench className="h-4 w-4" />,
  material: <Package className="h-4 w-4" />,
  subcontractor: <Hammer className="h-4 w-4" />,
};

const RESOURCE_TYPE_COLORS: Record<string, string> = {
  labor: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  equipment: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  material: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  subcontractor: "bg-violet-500/15 text-violet-300 border-violet-500/30",
};

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ResourcePanel({ scheduleId, activities, open, onOpenChange }: ResourcePanelProps) {
  const utils = trpc.useUtils();

  // ── Queries ──
  const { data: resources = [] } = trpc.schedule.listResources.useQuery({ scheduleId }, { enabled: open });
  const { data: assignments = [] } = trpc.schedule.listResourceAssignments.useQuery({ scheduleId }, { enabled: open });
  const { data: costAccounts = [] } = trpc.schedule.listCostAccounts.useQuery({ scheduleId }, { enabled: open });

  // ── Mutations ──
  const createResourceMut = trpc.schedule.createResource.useMutation({
    onSuccess: () => { utils.schedule.listResources.invalidate({ scheduleId }); toast.success("Resource created"); },
  });
  const updateResourceMut = trpc.schedule.updateResource.useMutation({
    onSuccess: () => { utils.schedule.listResources.invalidate({ scheduleId }); toast.success("Resource updated"); },
  });
  const deleteResourceMut = trpc.schedule.deleteResource.useMutation({
    onSuccess: () => {
      utils.schedule.listResources.invalidate({ scheduleId });
      utils.schedule.listResourceAssignments.invalidate({ scheduleId });
      toast.success("Resource deleted");
    },
  });
  const assignResourceMut = trpc.schedule.assignResource.useMutation({
    onSuccess: () => { utils.schedule.listResourceAssignments.invalidate({ scheduleId }); toast.success("Resource assigned"); },
  });
  const removeAssignmentMut = trpc.schedule.removeResourceAssignment.useMutation({
    onSuccess: () => { utils.schedule.listResourceAssignments.invalidate({ scheduleId }); toast.success("Assignment removed"); },
  });
  const updateAssignmentMut = trpc.schedule.updateResourceAssignment.useMutation({
    onSuccess: () => { utils.schedule.listResourceAssignments.invalidate({ scheduleId }); toast.success("Assignment updated"); },
  });
  const createCostAccountMut = trpc.schedule.createCostAccount.useMutation({
    onSuccess: () => { utils.schedule.listCostAccounts.invalidate({ scheduleId }); toast.success("Cost account created"); },
  });
  const updateCostAccountMut = trpc.schedule.updateCostAccount.useMutation({
    onSuccess: () => { utils.schedule.listCostAccounts.invalidate({ scheduleId }); toast.success("Cost account updated"); },
  });
  const deleteCostAccountMut = trpc.schedule.deleteCostAccount.useMutation({
    onSuccess: () => { utils.schedule.listCostAccounts.invalidate({ scheduleId }); toast.success("Cost account deleted"); },
  });

  // ── State ──
  const [activeTab, setActiveTab] = useState("resources");
  const [showAddResource, setShowAddResource] = useState(false);
  const [editingResource, setEditingResource] = useState<number | null>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showAddCostAccount, setShowAddCostAccount] = useState(false);

  // Resource form
  const [resName, setResName] = useState("");
  const [resType, setResType] = useState<"labor" | "equipment" | "material" | "subcontractor">("labor");
  const [resUnit, setResUnit] = useState("hr");
  const [resCostRate, setResCostRate] = useState("");
  const [resMaxUnits, setResMaxUnits] = useState("8.00");
  const [resNotes, setResNotes] = useState("");

  // Assignment form
  const [assignActivityId, setAssignActivityId] = useState<number | null>(null);
  const [assignResourceId, setAssignResourceId] = useState<number | null>(null);
  const [assignUnitsPerDay, setAssignUnitsPerDay] = useState("8.00");
  const [assignBudgetedCost, setAssignBudgetedCost] = useState("");

  // Cost account form
  const [caCode, setCaCode] = useState("");
  const [caName, setCaName] = useState("");
  const [caBudget, setCaBudget] = useState("");

  // ── Computed ──
  const totalBudgetedCost = useMemo(() => assignments.reduce((sum, a) => sum + a.budgetedCost, 0), [assignments]);
  const totalActualCost = useMemo(() => assignments.reduce((sum, a) => sum + a.actualCost, 0), [assignments]);

  const resourceMap = useMemo(() => {
    const map = new Map<number, (typeof resources)[0]>();
    resources.forEach((r) => map.set(r.id, r));
    return map;
  }, [resources]);

  const activityMap = useMemo(() => {
    const map = new Map<number, (typeof activities)[0]>();
    activities.forEach((a) => map.set(a.id, a));
    return map;
  }, [activities]);

  // ── Handlers ──
  function resetResourceForm() {
    setResName(""); setResType("labor"); setResUnit("hr"); setResCostRate(""); setResMaxUnits("8.00"); setResNotes("");
    setShowAddResource(false); setEditingResource(null);
  }

  function handleCreateResource() {
    if (!resName.trim()) { toast.error("Name is required"); return; }
    const costRateCents = Math.round(parseFloat(resCostRate || "0") * 100);
    createResourceMut.mutate({
      scheduleId,
      name: resName.trim(),
      resourceType: resType,
      unit: resUnit,
      costRate: costRateCents,
      maxUnitsPerDay: resMaxUnits,
      notes: resNotes || undefined,
    });
    resetResourceForm();
  }

  function handleUpdateResource(id: number) {
    const costRateCents = Math.round(parseFloat(resCostRate || "0") * 100);
    updateResourceMut.mutate({
      id,
      name: resName.trim() || undefined,
      resourceType: resType,
      unit: resUnit,
      costRate: costRateCents,
      maxUnitsPerDay: resMaxUnits,
      notes: resNotes || null,
    });
    resetResourceForm();
  }

  function startEditResource(r: (typeof resources)[0]) {
    setEditingResource(r.id);
    setResName(r.name);
    setResType(r.resourceType as any);
    setResUnit(r.unit);
    setResCostRate(String(r.costRate / 100));
    setResMaxUnits(String(r.maxUnitsPerDay));
    setResNotes(r.notes || "");
    setShowAddResource(true);
  }

  function handleAssignResource() {
    if (!assignActivityId || !assignResourceId) { toast.error("Select both activity and resource"); return; }
    const budgetCents = Math.round(parseFloat(assignBudgetedCost || "0") * 100);
    assignResourceMut.mutate({
      scheduleId,
      activityId: assignActivityId,
      resourceId: assignResourceId,
      unitsPerDay: assignUnitsPerDay,
      budgetedCost: budgetCents,
    });
    setShowAssignDialog(false);
    setAssignActivityId(null); setAssignResourceId(null); setAssignUnitsPerDay("8.00"); setAssignBudgetedCost("");
  }

  function handleCreateCostAccount() {
    if (!caCode.trim() || !caName.trim()) { toast.error("Code and name are required"); return; }
    const budgetCents = Math.round(parseFloat(caBudget || "0") * 100);
    createCostAccountMut.mutate({ scheduleId, code: caCode.trim(), name: caName.trim(), budget: budgetCents });
    setCaCode(""); setCaName(""); setCaBudget(""); setShowAddCostAccount(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-amber-400" /> Resources & Cost Loading
          </DialogTitle>
        </DialogHeader>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Resources</p>
            <p className="text-2xl font-bold text-white">{resources.length}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Assignments</p>
            <p className="text-2xl font-bold text-white">{assignments.length}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Budgeted Cost</p>
            <p className="text-lg font-bold text-sky-400">{formatCurrency(totalBudgetedCost)}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Actual Cost</p>
            <p className="text-lg font-bold text-emerald-400">{formatCurrency(totalActualCost)}</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="resources"><Users className="h-4 w-4 mr-1" /> Resources</TabsTrigger>
            <TabsTrigger value="assignments"><Wrench className="h-4 w-4 mr-1" /> Assignments</TabsTrigger>
            <TabsTrigger value="costs"><DollarSign className="h-4 w-4 mr-1" /> Cost Accounts</TabsTrigger>
          </TabsList>

          {/* ── Resources Tab ── */}
          <TabsContent value="resources" className="space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-400 font-medium">Define labor, equipment, materials, and subcontractors for this schedule.</p>
              <Button size="sm" onClick={() => { resetResourceForm(); setShowAddResource(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Add Resource
              </Button>
            </div>

            {showAddResource && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Name</Label>
                    <Input value={resName} onChange={(e) => setResName(e.target.value)} placeholder="e.g. Electrician Crew" className="mt-1.5" />
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Select value={resType} onValueChange={(v) => setResType(v as any)}>
                      <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="labor">Labor</SelectItem>
                        <SelectItem value="equipment">Equipment</SelectItem>
                        <SelectItem value="material">Material</SelectItem>
                        <SelectItem value="subcontractor">Subcontractor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Unit</Label>
                    <Input value={resUnit} onChange={(e) => setResUnit(e.target.value)} placeholder="hr" className="mt-1.5" />
                  </div>
                  <div>
                    <Label>Cost Rate ($/unit)</Label>
                    <Input type="number" step="0.01" value={resCostRate} onChange={(e) => setResCostRate(e.target.value)} placeholder="0.00" className="mt-1.5" />
                  </div>
                  <div>
                    <Label>Max Units/Day</Label>
                    <Input value={resMaxUnits} onChange={(e) => setResMaxUnits(e.target.value)} placeholder="8.00" className="mt-1.5" />
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Input value={resNotes} onChange={(e) => setResNotes(e.target.value)} placeholder="Optional notes" className="mt-1.5" />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  {editingResource ? (
                    <Button size="sm" onClick={() => handleUpdateResource(editingResource)}>
                      <Save className="h-4 w-4 mr-1" /> Update
                    </Button>
                  ) : (
                    <Button size="sm" onClick={handleCreateResource}>
                      <Plus className="h-4 w-4 mr-1" /> Create
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={resetResourceForm}>
                    <X className="h-4 w-4 mr-1" /> Cancel
                  </Button>
                </div>
              </div>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Cost Rate</TableHead>
                  <TableHead className="text-right">Max/Day</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resources.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 font-medium py-8">
                      No resources defined. Click "Add Resource" to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  resources.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium text-gray-100">{r.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={RESOURCE_TYPE_COLORS[r.resourceType] || ""}>
                          <span className="flex items-center gap-1">
                            {RESOURCE_TYPE_ICONS[r.resourceType]}
                            {r.resourceType}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-300">{r.unit}</TableCell>
                      <TableCell className="text-right text-gray-200">{formatCurrency(r.costRate)}</TableCell>
                      <TableCell className="text-right text-gray-300">{String(r.maxUnitsPerDay)}</TableCell>
                      <TableCell className="text-gray-500 text-sm">{r.notes || "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-gray-400 hover:text-white" onClick={() => startEditResource(r)}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400/70 hover:text-red-400" onClick={() => deleteResourceMut.mutate({ id: r.id })}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TabsContent>

          {/* ── Assignments Tab ── */}
          <TabsContent value="assignments" className="space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-400 font-medium">Assign resources to activities and track budgeted vs. actual costs.</p>
              <Button size="sm" onClick={() => setShowAssignDialog(true)} disabled={resources.length === 0 || activities.length === 0}>
                <Plus className="h-4 w-4 mr-1" /> Assign Resource
              </Button>
            </div>

            {showAssignDialog && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Activity</Label>
                    <Select value={assignActivityId?.toString() || ""} onValueChange={(v) => setAssignActivityId(Number(v))}>
                      <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select activity" /></SelectTrigger>
                      <SelectContent>
                        {activities.map((a) => (
                          <SelectItem key={a.id} value={a.id.toString()}>
                            {a.activityId} — {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Resource</Label>
                    <Select value={assignResourceId?.toString() || ""} onValueChange={(v) => setAssignResourceId(Number(v))}>
                      <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select resource" /></SelectTrigger>
                      <SelectContent>
                        {resources.map((r) => (
                          <SelectItem key={r.id} value={r.id.toString()}>
                            {r.name} ({r.resourceType})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Units/Day</Label>
                    <Input value={assignUnitsPerDay} onChange={(e) => setAssignUnitsPerDay(e.target.value)} placeholder="8.00" className="mt-1.5" />
                  </div>
                  <div>
                    <Label>Budgeted Cost ($)</Label>
                    <Input type="number" step="0.01" value={assignBudgetedCost} onChange={(e) => setAssignBudgetedCost(e.target.value)} placeholder="0.00" className="mt-1.5" />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={handleAssignResource}><Plus className="h-4 w-4 mr-1" /> Assign</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowAssignDialog(false)}><X className="h-4 w-4 mr-1" /> Cancel</Button>
                </div>
              </div>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Activity</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead className="text-right">Units/Day</TableHead>
                  <TableHead className="text-right">Budgeted</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="w-16">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500 font-medium py-8">
                      No resource assignments. Define resources first, then assign them to activities.
                    </TableCell>
                  </TableRow>
                ) : (
                  assignments.map((a) => {
                    const act = activityMap.get(a.activityId);
                    const res = resourceMap.get(a.resourceId);
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium text-gray-100">
                          {act ? `${act.activityId} — ${act.name}` : `Activity #${a.activityId}`}
                        </TableCell>
                        <TableCell>
                          {res ? (
                            <span className="flex items-center gap-1 text-gray-200">
                              {RESOURCE_TYPE_ICONS[res.resourceType]}
                              {res.name}
                            </span>
                          ) : `Resource #${a.resourceId}`}
                        </TableCell>
                        <TableCell className="text-right text-gray-300">{String(a.unitsPerDay)}</TableCell>
                        <TableCell className="text-right text-sky-400 font-medium">{formatCurrency(a.budgetedCost)}</TableCell>
                        <TableCell className="text-right text-emerald-400 font-medium">{formatCurrency(a.actualCost)}</TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400/70 hover:text-red-400" onClick={() => removeAssignmentMut.mutate({ id: a.id })}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TabsContent>

          {/* ── Cost Accounts Tab ── */}
          <TabsContent value="costs" className="space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-400 font-medium">Define cost accounts to categorize and track project expenditures.</p>
              <Button size="sm" onClick={() => setShowAddCostAccount(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add Cost Account
              </Button>
            </div>

            {showAddCostAccount && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Code</Label>
                    <Input value={caCode} onChange={(e) => setCaCode(e.target.value)} placeholder="e.g. 03-CONCRETE" className="mt-1.5" />
                  </div>
                  <div>
                    <Label>Name</Label>
                    <Input value={caName} onChange={(e) => setCaName(e.target.value)} placeholder="e.g. Concrete Work" className="mt-1.5" />
                  </div>
                  <div>
                    <Label>Budget ($)</Label>
                    <Input type="number" step="0.01" value={caBudget} onChange={(e) => setCaBudget(e.target.value)} placeholder="0.00" className="mt-1.5" />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={handleCreateCostAccount}><Plus className="h-4 w-4 mr-1" /> Create</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowAddCostAccount(false)}><X className="h-4 w-4 mr-1" /> Cancel</Button>
                </div>
              </div>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Budget</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costAccounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-500 font-medium py-8">
                      No cost accounts defined. Click "Add Cost Account" to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  costAccounts.map((ca) => (
                    <TableRow key={ca.id}>
                      <TableCell className="font-mono font-medium text-amber-300">{ca.code}</TableCell>
                      <TableCell className="text-gray-200">{ca.name}</TableCell>
                      <TableCell className="text-right text-sky-400 font-medium">{formatCurrency(ca.budget)}</TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400/70 hover:text-red-400" onClick={() => deleteCostAccountMut.mutate({ id: ca.id })}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
