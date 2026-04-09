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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  labor: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  equipment: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  material: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  subcontractor: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
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
      <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto bg-white text-gray-900 font-medium">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <DollarSign className="h-5 w-5" /> Resources & Cost Loading
          </DialogTitle>
        </DialogHeader>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-sm text-gray-700 font-semibold">Resources</p>
              <p className="text-2xl font-bold">{resources.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-sm text-gray-700 font-semibold">Assignments</p>
              <p className="text-2xl font-bold">{assignments.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-sm text-gray-700 font-semibold">Budgeted Cost</p>
              <p className="text-lg font-bold text-blue-600">{formatCurrency(totalBudgetedCost)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-sm text-gray-700 font-semibold">Actual Cost</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(totalActualCost)}</p>
            </CardContent>
          </Card>
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
              <p className="text-sm text-gray-600 font-medium">Define labor, equipment, materials, and subcontractors for this schedule.</p>
              <Button size="sm" onClick={() => { resetResourceForm(); setShowAddResource(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Add Resource
              </Button>
            </div>

            {showAddResource && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm font-semibold text-gray-800">Name</Label>
                      <Input value={resName} onChange={(e) => setResName(e.target.value)} placeholder="e.g. Electrician Crew" />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold text-gray-800">Type</Label>
                      <Select value={resType} onValueChange={(v) => setResType(v as any)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="labor">Labor</SelectItem>
                          <SelectItem value="equipment">Equipment</SelectItem>
                          <SelectItem value="material">Material</SelectItem>
                          <SelectItem value="subcontractor">Subcontractor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm font-semibold text-gray-800">Unit</Label>
                      <Input value={resUnit} onChange={(e) => setResUnit(e.target.value)} placeholder="hr" />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold text-gray-800">Cost Rate ($/unit)</Label>
                      <Input type="number" step="0.01" value={resCostRate} onChange={(e) => setResCostRate(e.target.value)} placeholder="0.00" />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold text-gray-800">Max Units/Day</Label>
                      <Input value={resMaxUnits} onChange={(e) => setResMaxUnits(e.target.value)} placeholder="8.00" />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold text-gray-800">Notes</Label>
                      <Input value={resNotes} onChange={(e) => setResNotes(e.target.value)} placeholder="Optional notes" />
                    </div>
                  </div>
                  <div className="flex gap-2">
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
                </CardContent>
              </Card>
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
                    <TableCell colSpan={7} className="text-center text-gray-600 font-medium py-8">
                      No resources defined. Click "Add Resource" to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  resources.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={RESOURCE_TYPE_COLORS[r.resourceType] || ""}>
                          <span className="flex items-center gap-1">
                            {RESOURCE_TYPE_ICONS[r.resourceType]}
                            {r.resourceType}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell>{r.unit}</TableCell>
                      <TableCell className="text-right">{formatCurrency(r.costRate)}</TableCell>
                      <TableCell className="text-right">{String(r.maxUnitsPerDay)}</TableCell>
                      <TableCell className="text-gray-600 font-medium text-sm">{r.notes || "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEditResource(r)}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteResourceMut.mutate({ id: r.id })}>
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
              <p className="text-sm text-gray-600 font-medium">Assign resources to activities and track budgeted vs. actual costs.</p>
              <Button size="sm" onClick={() => setShowAssignDialog(true)} disabled={resources.length === 0 || activities.length === 0}>
                <Plus className="h-4 w-4 mr-1" /> Assign Resource
              </Button>
            </div>

            {showAssignDialog && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm font-semibold text-gray-800">Activity</Label>
                      <Select value={assignActivityId?.toString() || ""} onValueChange={(v) => setAssignActivityId(Number(v))}>
                        <SelectTrigger><SelectValue placeholder="Select activity" /></SelectTrigger>
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
                      <Label className="text-sm font-semibold text-gray-800">Resource</Label>
                      <Select value={assignResourceId?.toString() || ""} onValueChange={(v) => setAssignResourceId(Number(v))}>
                        <SelectTrigger><SelectValue placeholder="Select resource" /></SelectTrigger>
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
                      <Label className="text-sm font-semibold text-gray-800">Units/Day</Label>
                      <Input value={assignUnitsPerDay} onChange={(e) => setAssignUnitsPerDay(e.target.value)} placeholder="8.00" />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold text-gray-800">Budgeted Cost ($)</Label>
                      <Input type="number" step="0.01" value={assignBudgetedCost} onChange={(e) => setAssignBudgetedCost(e.target.value)} placeholder="0.00" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAssignResource}><Plus className="h-4 w-4 mr-1" /> Assign</Button>
                    <Button size="sm" variant="outline" onClick={() => setShowAssignDialog(false)}><X className="h-4 w-4 mr-1" /> Cancel</Button>
                  </div>
                </CardContent>
              </Card>
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
                    <TableCell colSpan={6} className="text-center text-gray-600 font-medium py-8">
                      No resource assignments. Define resources first, then assign them to activities.
                    </TableCell>
                  </TableRow>
                ) : (
                  assignments.map((a) => {
                    const act = activityMap.get(a.activityId);
                    const res = resourceMap.get(a.resourceId);
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">
                          {act ? `${act.activityId} — ${act.name}` : `Activity #${a.activityId}`}
                        </TableCell>
                        <TableCell>
                          {res ? (
                            <span className="flex items-center gap-1">
                              {RESOURCE_TYPE_ICONS[res.resourceType]}
                              {res.name}
                            </span>
                          ) : `Resource #${a.resourceId}`}
                        </TableCell>
                        <TableCell className="text-right">{String(a.unitsPerDay)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(a.budgetedCost)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(a.actualCost)}</TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeAssignmentMut.mutate({ id: a.id })}>
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
              <p className="text-sm text-gray-600 font-medium">Define cost accounts to categorize and track project expenditures.</p>
              <Button size="sm" onClick={() => setShowAddCostAccount(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add Cost Account
              </Button>
            </div>

            {showAddCostAccount && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-sm font-semibold text-gray-800">Code</Label>
                      <Input value={caCode} onChange={(e) => setCaCode(e.target.value)} placeholder="e.g. 03-CONCRETE" />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold text-gray-800">Name</Label>
                      <Input value={caName} onChange={(e) => setCaName(e.target.value)} placeholder="e.g. Concrete Work" />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold text-gray-800">Budget ($)</Label>
                      <Input type="number" step="0.01" value={caBudget} onChange={(e) => setCaBudget(e.target.value)} placeholder="0.00" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleCreateCostAccount}><Plus className="h-4 w-4 mr-1" /> Create</Button>
                    <Button size="sm" variant="outline" onClick={() => setShowAddCostAccount(false)}><X className="h-4 w-4 mr-1" /> Cancel</Button>
                  </div>
                </CardContent>
              </Card>
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
                    <TableCell colSpan={4} className="text-center text-gray-600 font-medium py-8">
                      No cost accounts defined. Click "Add Cost Account" to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  costAccounts.map((ca) => (
                    <TableRow key={ca.id}>
                      <TableCell className="font-mono font-medium">{ca.code}</TableCell>
                      <TableCell>{ca.name}</TableCell>
                      <TableCell className="text-right">{formatCurrency(ca.budget)}</TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteCostAccountMut.mutate({ id: ca.id })}>
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
