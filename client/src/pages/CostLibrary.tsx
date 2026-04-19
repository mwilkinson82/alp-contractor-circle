/**
 * CostLibrary — Upload and manage your own unit cost data for ConstructLine.
 * Supports CSV and Excel (.xlsx) uploads. Entries are matched to takeoff items
 * by description keyword similarity during post-processing.
 */
import { useState, useRef, useEffect } from "react";
import { useMember } from "@/hooks/useMember";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  Upload,
  Trash2,
  BookOpen,
  Loader2,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  Search,
  X,
  Plus,
  Pencil,
  Check,
  RefreshCw,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ParsedEntry {
  description: string;
  unit: string;
  unitCost: number;
  csiDivision?: string;
  notes?: string;
}

interface ParseError {
  row: number;
  message: string;
}
interface EditState {
  description: string;
  unit: string;
  unitCost: string;
  csiDivision: string;
  notes: string;
}

// ─── CSV Template Download ────────────────────────────────────────────────────
function downloadTemplate() {
  const headers = ["Description", "Unit", "Unit Cost (USD)", "CSI Division (optional)", "Notes (optional)"];
  const examples = [
    ["3000 PSI Concrete (ready-mix)", "CY", "145.00", "03", "Ready-mix delivered"],
    ["#4 Rebar", "LF", "0.85", "03", ""],
    ["Compacted Gravel Base", "CY", "32.00", "31", ""],
    ["6\" PVC Pipe", "LF", "12.50", "33", ""],
    ["Concrete Formwork (SFCA)", "SFCA", "3.50", "03", ""],
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...examples]);
  ws["!cols"] = [{ wch: 40 }, { wch: 10 }, { wch: 18 }, { wch: 22 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, ws, "Cost Library");
  XLSX.writeFile(wb, "ConstructLine_Cost_Library_Template.xlsx");
}

// ─── Parse CSV/Excel ──────────────────────────────────────────────────────────
function parseFile(file: File): Promise<{ entries: ParsedEntry[]; errors: ParseError[] }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

        const entries: ParsedEntry[] = [];
        const errors: ParseError[] = [];

        // Skip header row (row 0)
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.every((c: any) => !c)) continue; // skip blank rows

          const description = String(row[0] || "").trim();
          const unit = String(row[1] || "").trim().toUpperCase();
          const rawCost = row[2];
          const csiDivision = String(row[3] || "").trim().replace(/\D/g, "").slice(0, 2) || undefined;
          const notes = String(row[4] || "").trim() || undefined;

          if (!description) {
            errors.push({ row: i + 1, message: "Missing description" });
            continue;
          }
          if (!unit) {
            errors.push({ row: i + 1, message: `Row ${i + 1}: Missing unit` });
            continue;
          }
          const unitCost = parseFloat(String(rawCost).replace(/[$,]/g, ""));
          if (isNaN(unitCost) || unitCost < 0) {
            errors.push({ row: i + 1, message: `Row ${i + 1}: Invalid unit cost "${rawCost}"` });
            continue;
          }

          entries.push({ description, unit, unitCost, csiDivision, notes });
        }

        resolve({ entries, errors });
      } catch (err) {
        resolve({ entries: [], errors: [{ row: 0, message: `Failed to parse file: ${String(err)}` }] });
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CostLibrary() {
  const { member } = useMember();
  const [, setLocation] = useLocation();
  const isAdmin = member?.memberRole === "admin";

  // Redirect non-admins away
  useEffect(() => {
    if (member && !isAdmin) {
      setLocation("/portal");
    }
  }, [member, isAdmin, setLocation]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [parseErrors, setParseErrors] = useState<ParseError[]>([]);
  const [pendingEntries, setPendingEntries] = useState<ParsedEntry[] | null>(null);
  const [pendingFilename, setPendingFilename] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editState, setEditState] = useState<EditState>({ description: "", unit: "", unitCost: "", csiDivision: "", notes: "" });
  const [showAddRow, setShowAddRow] = useState(false);
  const [addState, setAddState] = useState<EditState>({ description: "", unit: "", unitCost: "", csiDivision: "", notes: "" });

  const { data: entries, isLoading, refetch } = trpc.takeoff.getCostLibrary.useQuery();

  const uploadMutation = trpc.takeoff.uploadCostLibrary.useMutation({
    onSuccess: (result) => {
      toast.success(`${result.count} cost entries saved to your library`);
      setPendingEntries(null);
      setParseErrors([]);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.takeoff.deleteCostLibraryEntry.useMutation({
    onSuccess: () => { toast.success("Entry deleted"); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const clearMutation = trpc.takeoff.clearCostLibrary.useMutation({
    onSuccess: () => { toast.success("Cost library cleared"); refetch(); },
    onError: (err) => toast.error(err.message),
  });
  const updateMutation = trpc.takeoff.updateCostLibraryEntry.useMutation({
    onSuccess: () => { toast.success("Entry updated"); setEditingId(null); refetch(); },
    onError: (err: any) => toast.error(err.message),
  });
  const addMutation = trpc.takeoff.addCostLibraryEntry.useMutation({
    onSuccess: () => { toast.success("Entry added"); setShowAddRow(false); setAddState({ description: "", unit: "", unitCost: "", csiDivision: "", notes: "" }); refetch(); },
    onError: (err: any) => toast.error(err.message),
  });
  const loadDefaultsMutation = trpc.takeoff.loadDefaults.useMutation({
    onSuccess: (result: any) => { toast.success(`Loaded ${result.count} ConstructLine baseline prices`); refetch(); },
    onError: (err: any) => toast.error(err.message),
  });

  // Auto-load ConstructLine defaults on first visit if library is empty
  const hasAutoLoaded = useRef(false);
  useEffect(() => {
    if (!isLoading && entries && entries.length === 0 && !loadDefaultsMutation.isPending && !hasAutoLoaded.current) {
      hasAutoLoaded.current = true;
      loadDefaultsMutation.mutate();
    }
  }, [isLoading, entries]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
    const isCsv = file.name.endsWith(".csv");
    if (!isExcel && !isCsv) {
      toast.error("Please upload a CSV or Excel (.xlsx) file");
      return;
    }

    toast.info(`Parsing ${file.name}…`);
    const { entries: parsed, errors } = await parseFile(file);
    setParseErrors(errors);

    if (parsed.length === 0) {
      toast.error("No valid rows found. Check the file format.");
      return;
    }

    setPendingEntries(parsed);
    setPendingFilename(file.name);
  };

  const handleConfirmUpload = () => {
    if (!pendingEntries) return;
    uploadMutation.mutate({ entries: pendingEntries });
  };
  const startEdit = (entry: any) => {
    setEditingId(entry.id);
    setEditState({ description: entry.description, unit: entry.unit, unitCost: (entry.unitCost / 100).toFixed(2), csiDivision: entry.csiDivision || "", notes: entry.notes || "" });
  };
  const saveEdit = () => {
    if (!editingId) return;
    const uc = parseFloat(editState.unitCost);
    if (isNaN(uc) || uc < 0) { toast.error("Invalid unit cost"); return; }
    updateMutation.mutate({ entryId: editingId, description: editState.description, unit: editState.unit.toUpperCase(), unitCost: uc, csiDivision: editState.csiDivision || undefined, notes: editState.notes || undefined });
  };
  const saveAdd = () => {
    const uc = parseFloat(addState.unitCost);
    if (!addState.description.trim()) { toast.error("Description required"); return; }
    if (!addState.unit.trim()) { toast.error("Unit required"); return; }
    if (isNaN(uc) || uc < 0) { toast.error("Invalid unit cost"); return; }
    addMutation.mutate({ description: addState.description, unit: addState.unit.toUpperCase(), unitCost: uc, csiDivision: addState.csiDivision || undefined, notes: addState.notes || undefined });
  };
  const inputCls = "h-7 text-xs bg-navy-deep/70 border-white/20 text-cream placeholder:text-cream-muted/40 px-2";

  const filtered = (entries || []).filter((e: any) =>
    !search || e.description.toLowerCase().includes(search.toLowerCase()) ||
    (e.unit || "").toLowerCase().includes(search.toLowerCase())
  );

  const formatCost = (cents: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(cents / 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tight text-white leading-tight">
              Construct<span className="text-amber-400">Line</span>
            </span>
            <span className="text-[9px] text-gray-500 tracking-wider uppercase leading-tight">Powered by ALP</span>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div>
            <h1 className="text-xl font-bold text-cream">My Cost Library</h1>
            <p className="text-cream-muted text-sm">
              Upload your own unit costs — <span className="font-semibold"><span className="text-white">Construct</span><span className="text-amber-400">Line</span></span> will match them to takeoff items automatically.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={downloadTemplate}
            className="border-white/20 text-cream-muted hover:text-cream hover:bg-white/5 gap-1.5"
          >
            <Download className="w-4 h-4" />
            Template
          </Button>
          <Button
            onClick={() => fileInputRef.current?.click()}
            className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold shadow-lg gap-2"
          >
            <Upload className="w-4 h-4" />
            Upload CSV / Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setShowAddRow(true); setAddState({ description: "", unit: "", unitCost: "", csiDivision: "", notes: "" }); }}
            className="border-white/20 text-cream hover:bg-white/5 gap-1.5">
            <Plus className="w-3.5 h-3.5" />Add Row
          </Button>
          <Button variant="outline" size="sm"
            onClick={() => { if (!confirm("Load ConstructLine baseline prices into your library? This will add/replace all default entries.")) return; loadDefaultsMutation.mutate(); }}
            disabled={loadDefaultsMutation.isPending}
            className="border-blue-500/30 text-blue-300 hover:bg-blue-500/10 gap-1.5">
            {loadDefaultsMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Load ConstructLine Pricing Defaults
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      </div>

      {/* How it works banner */}
      <Card className="bg-amber-500/5 border-amber-500/20">
        <CardContent className="py-3 px-4">
          <div className="flex items-start gap-3">
            <BookOpen className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div className="text-sm text-cream-muted space-y-0.5">
              <p className="text-amber-300 font-medium">How your cost library works</p>
              <p>
                When <span className="font-semibold"><span className="text-white">Construct</span><span className="text-amber-400">Line</span></span> runs a takeoff, it checks your library first. If a takeoff item's description
                matches one of your entries, your unit cost overrides the built-in cost table. Entries are matched
                by keyword similarity — the closer the description, the higher the match priority.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Parse errors */}
      {parseErrors.length > 0 && (
        <Card className="bg-red-500/5 border-red-500/20">
          <CardContent className="py-3 px-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-red-300 font-medium text-sm mb-1">
                  {parseErrors.length} row{parseErrors.length !== 1 ? "s" : ""} skipped due to errors
                </p>
                <ul className="text-red-300/80 text-xs space-y-0.5">
                  {parseErrors.slice(0, 5).map((e, i) => (
                    <li key={i}>Row {e.row}: {e.message}</li>
                  ))}
                  {parseErrors.length > 5 && <li>…and {parseErrors.length - 5} more</li>}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending upload confirmation */}
      {pendingEntries && (
        <Card className="bg-emerald-500/5 border-emerald-500/30">
          <CardContent className="py-4 px-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-emerald-300 font-semibold text-sm">
                    Ready to import {pendingEntries.length} entries from <span className="font-mono">{pendingFilename}</span>
                  </p>
                  <p className="text-cream-muted text-xs mt-0.5">
                    This will <strong className="text-cream">replace</strong> your existing cost library. Review the preview below before confirming.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setPendingEntries(null); setParseErrors([]); }}
                  className="border-white/20 text-cream-muted hover:text-cream"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleConfirmUpload}
                  disabled={uploadMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                >
                  {uploadMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  Confirm Import
                </Button>
              </div>
            </div>

            {/* Preview table */}
            <div className="mt-4 rounded-lg border border-emerald-500/20 overflow-hidden">
              <div className="overflow-x-auto max-h-64">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-emerald-500/10 text-emerald-300">
                      <th className="text-left px-3 py-2 font-semibold">Description</th>
                      <th className="text-left px-3 py-2 font-semibold w-16">Unit</th>
                      <th className="text-right px-3 py-2 font-semibold w-28">Unit Cost</th>
                      <th className="text-left px-3 py-2 font-semibold w-20">CSI Div</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingEntries.slice(0, 50).map((e, i) => (
                      <tr key={i} className="border-t border-emerald-500/10 hover:bg-emerald-500/5">
                        <td className="px-3 py-1.5 text-cream">{e.description}</td>
                        <td className="px-3 py-1.5 text-cream-muted font-mono">{e.unit}</td>
                        <td className="px-3 py-1.5 text-amber-400 font-mono text-right">
                          ${e.unitCost.toFixed(2)}
                        </td>
                        <td className="px-3 py-1.5 text-cream-muted">{e.csiDivision || "—"}</td>
                      </tr>
                    ))}
                    {pendingEntries.length > 50 && (
                      <tr className="border-t border-emerald-500/10">
                        <td colSpan={4} className="px-3 py-2 text-cream-muted/60 text-center">
                          …and {pendingEntries.length - 50} more rows
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing library */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      ) : !entries?.length && !pendingEntries ? (
        <Card className="bg-navy-medium/50 border-white/10">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
              <FileSpreadsheet className="w-8 h-8 text-amber-500" />
            </div>
            <h3 className="text-lg font-semibold text-cream mb-2">No Cost Library Yet</h3>
            <p className="text-cream-muted text-center max-w-md mb-6">
              Upload a CSV or Excel file with your own material unit costs. <span className="font-semibold"><span className="text-white">Construct</span><span className="text-amber-400">Line</span></span> will use them
              to price your takeoffs instead of the built-in cost table.
            </p>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={downloadTemplate}
                className="border-white/20 text-cream-muted hover:text-cream gap-1.5"
              >
                <Download className="w-4 h-4" />
                Download Template
              </Button>
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white gap-2"
              >
                <Upload className="w-4 h-4" />
                Upload CSV / Excel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : entries && entries.length > 0 ? (
        <Card className="bg-navy-medium/50 border-white/10">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-cream text-base">
                  Your Cost Library
                  <Badge className="ml-2 bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
                    {entries.length} entries
                  </Badge>
                </CardTitle>
                <CardDescription className="text-cream-muted text-xs mt-0.5">
                  These unit costs will override the built-in cost table during takeoff processing.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm("Clear all entries from your cost library? This cannot be undone.")) {
                    clearMutation.mutate();
                  }
                }}
                disabled={clearMutation.isPending}
                className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 gap-1.5"
              >
                {clearMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Clear All
              </Button>
            </div>
            {/* Search */}
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cream-muted/50" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search descriptions or units…"
                className="pl-8 h-8 text-sm bg-navy-deep/50 border-white/10 text-cream placeholder:text-cream-muted/40"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-cream-muted/50 hover:text-cream">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="rounded-lg border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-navy-deep/60 text-cream-muted text-xs">
                      <th className="text-left px-4 py-2.5 font-semibold">Description</th>
                      <th className="text-left px-3 py-2.5 font-semibold w-16">Unit</th>
                      <th className="text-right px-3 py-2.5 font-semibold w-28">Unit Cost</th>
                      <th className="text-left px-3 py-2.5 font-semibold w-20">CSI Div</th>
                      <th className="text-left px-3 py-2.5 font-semibold">Notes</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {/* Add Row inline form */}
                    {showAddRow && (
                      <tr className="border-t border-amber-500/30 bg-amber-500/5">
                        <td className="px-3 py-2"><Input value={addState.description} onChange={e => setAddState(s => ({ ...s, description: e.target.value }))} placeholder="Description" className={inputCls} /></td>
                        <td className="px-2 py-2"><Input value={addState.unit} onChange={e => setAddState(s => ({ ...s, unit: e.target.value }))} placeholder="CY" className={inputCls + " w-14"} /></td>
                        <td className="px-2 py-2"><Input value={addState.unitCost} onChange={e => setAddState(s => ({ ...s, unitCost: e.target.value }))} placeholder="0.00" type="number" min="0" step="0.01" className={inputCls + " w-24 text-right"} /></td>
                        <td className="px-2 py-2"><Input value={addState.csiDivision} onChange={e => setAddState(s => ({ ...s, csiDivision: e.target.value }))} placeholder="03" className={inputCls + " w-14"} /></td>
                        <td className="px-2 py-2"><Input value={addState.notes} onChange={e => setAddState(s => ({ ...s, notes: e.target.value }))} placeholder="Notes" className={inputCls} /></td>
                        <td className="px-2 py-2"><div className="flex gap-1">
                          <button onClick={saveAdd} disabled={addMutation.isPending} className="text-green-400 hover:text-green-300 p-1">{addMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}</button>
                          <button onClick={() => setShowAddRow(false)} className="text-cream-muted/50 hover:text-cream p-1"><X className="w-3.5 h-3.5" /></button>
                        </div></td>
                      </tr>
                    )}
                    {filtered.map((entry: any) => {
                      const isEditing = editingId === entry.id;
                      return isEditing ? (
                        <tr key={entry.id} className="border-t border-amber-500/30 bg-amber-500/5">
                          <td className="px-3 py-1.5"><Input value={editState.description} onChange={e => setEditState(s => ({ ...s, description: e.target.value }))} className={inputCls} /></td>
                          <td className="px-2 py-1.5"><Input value={editState.unit} onChange={e => setEditState(s => ({ ...s, unit: e.target.value }))} className={inputCls + " w-14"} /></td>
                          <td className="px-2 py-1.5"><Input value={editState.unitCost} onChange={e => setEditState(s => ({ ...s, unitCost: e.target.value }))} type="number" min="0" step="0.01" className={inputCls + " w-24 text-right"} /></td>
                          <td className="px-2 py-1.5"><Input value={editState.csiDivision} onChange={e => setEditState(s => ({ ...s, csiDivision: e.target.value }))} className={inputCls + " w-14"} /></td>
                          <td className="px-2 py-1.5"><Input value={editState.notes} onChange={e => setEditState(s => ({ ...s, notes: e.target.value }))} className={inputCls} /></td>
                          <td className="px-2 py-1.5"><div className="flex gap-1">
                            <button onClick={saveEdit} disabled={updateMutation.isPending} className="text-green-400 hover:text-green-300 p-1">{updateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}</button>
                            <button onClick={() => setEditingId(null)} className="text-cream-muted/50 hover:text-cream p-1"><X className="w-3.5 h-3.5" /></button>
                          </div></td>
                        </tr>
                      ) : (
                        <tr key={entry.id} className="border-t border-white/5 hover:bg-white/3 group">
                          <td className="px-4 py-2.5 text-cream cursor-pointer" onClick={() => startEdit(entry)}><span className="group-hover:underline decoration-white/20">{entry.description}</span></td>
                          <td className="px-3 py-2.5 text-cream-muted font-mono text-xs">{entry.unit}</td>
                          <td className="px-3 py-2.5 text-amber-400 font-mono text-right text-xs">{formatCost(entry.unitCost)}</td>
                          <td className="px-3 py-2.5 text-cream-muted text-xs">{entry.csiDivision ? (<Badge className="bg-blue-500/10 text-blue-300 border-blue-500/20 text-[10px]">Div {entry.csiDivision}</Badge>) : "—"}</td>
                          <td className="px-3 py-2.5 text-cream-muted/60 text-xs truncate max-w-xs">{entry.notes || "—"}</td>
                          <td className="px-2 py-2.5"><div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => startEdit(entry)} className="text-cream-muted/50 hover:text-amber-400 p-1"><Pencil className="w-3.5 h-3.5" /></button>
                            <button onClick={() => deleteMutation.mutate({ entryId: entry.id })} disabled={deleteMutation.isPending} className="text-cream-muted/50 hover:text-red-400 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div></td>
                        </tr>
                      );
                    })}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-cream-muted/50 text-sm">
                          No entries match your search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {search && filtered.length < entries.length && (
              <p className="text-cream-muted/50 text-xs mt-2 text-right">
                Showing {filtered.length} of {entries.length} entries
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
