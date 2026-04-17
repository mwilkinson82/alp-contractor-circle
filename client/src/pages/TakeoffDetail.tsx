/**
 * TakeoffDetail — Full takeoff project view with drawing upload,
 * ConstructLine processing status, and quantity review/edit table.
 */
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import ProjectSettingsPanel from "@/components/ProjectSettingsPanel";
import PreAnalysisModal, { type PreAnalysisSettings } from "@/components/PreAnalysisModal";
import ProcessingOverlay from "@/components/ProcessingOverlay";
import ItemDetailModal from "@/components/ItemDetailModal";
import { playCompletionChime, sendCompletionNotification } from "@/lib/completionChime";
import {
  ArrowLeft,
  Upload,
  FileImage,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Play,
  RefreshCw,
  Eye,
  Edit3,
  Trash2,
  DollarSign,
  PoundSterling,
  FileStack,
  Download,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  CheckSquare,
  Square,
  Calculator,
  Percent,
  PlusCircle,
  Layers,
  Ruler,
} from "lucide-react";
import { MeasurementRollup } from "@/components/MeasurementRollup";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CURRENCY_LOCALE: Record<string, string> = {
  USD: "en-US",
  GBP: "en-GB",
  AUD: "en-AU",
};

function formatCurrency(cents: number, currencyCode: string = "USD"): string {
  const locale = CURRENCY_LOCALE[currencyCode] || "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

const SHEET_STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pending", color: "bg-gray-500/20 text-gray-300", icon: Clock },
  processing: { label: "Analyzing...", color: "bg-amber-500/20 text-amber-300", icon: Loader2 },
  completed: { label: "Done", color: "bg-emerald-500/20 text-emerald-300", icon: CheckCircle2 },
  error: { label: "Error", color: "bg-red-500/20 text-red-300", icon: AlertCircle },
  skipped: { label: "Skipped", color: "bg-gray-500/20 text-gray-400", icon: X },
};

const CSI_DIVISION_NAMES: Record<string, string> = {
  "01": "General Requirements",
  "02": "Existing Conditions",
  "03": "Concrete",
  "04": "Masonry",
  "05": "Metals",
  "06": "Wood, Plastics & Composites",
  "07": "Thermal & Moisture Protection",
  "08": "Openings",
  "09": "Finishes",
  "10": "Specialties",
  "11": "Equipment",
  "12": "Furnishings",
  "21": "Fire Suppression",
  "22": "Plumbing",
  "23": "HVAC",
  "26": "Electrical",
  "27": "Communications",
  "28": "Electronic Safety",
  "31": "Earthwork",
  "32": "Exterior Improvements",
  "33": "Utilities",
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TakeoffDetail() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/takeoff/:id");
  const projectId = params?.id ? parseInt(params.id, 10) : 0;

  const [activeTab, setActiveTab] = useState("sheets");
  const [previewSheet, setPreviewSheet] = useState<any>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [collapsedDivisions, setCollapsedDivisions] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showPreAnalysis, setShowPreAnalysis] = useState(false);
  const [showMarkup, setShowMarkup] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showRollup, setShowRollup] = useState(false);
  const [addItemDivision, setAddItemDivision] = useState<string>("03");
  const [markups, setMarkups] = useState({
    labor: 0,
    overhead: 0,
    profit: 0,
    bonds: 0,
    contingency: 0,
  });

  // ─── Preferred Currency ──────────────────────────────────────────────────
  const preferredCurrencyQuery = trpc.takeoff.getPreferredCurrency.useQuery();
  const savePreferredCurrency = trpc.takeoff.savePreferredCurrency.useMutation();

  // ─── Data Queries ─────────────────────────────────────────────────────────

  const { data: project, isLoading, refetch: refetchProject } = trpc.takeoff.getProject.useQuery(
    { id: projectId },
    { enabled: projectId > 0, refetchInterval: (query) => {
      const status = query.state.data?.status;
      return (status === "processing" || status === "post_processing") ? 3000 : false;
    }}
  );

  const { data: items, refetch: refetchItems } = trpc.takeoff.getItems.useQuery(
    { projectId },
    { enabled: projectId > 0 }
  );

  // ─── Measurement Rollup Query ──────────────────────────────────────────
  const { data: projectMarkups } = trpc.takeoff.getProjectMarkups.useQuery(
    { projectId },
    { enabled: projectId > 0 }
  );

  // ─── Verified (measurement history) items ─────────────────────────────
  const { data: verifiedItemIds } = trpc.takeoff.getItemsWithMeasurements.useQuery(
    { projectId },
    { enabled: projectId > 0 }
  );
  const verifiedSet = useMemo(() => new Set(verifiedItemIds || []), [verifiedItemIds]);

  const { data: progress, refetch: refetchProgress } = trpc.takeoff.getProgress.useQuery(
    { projectId },
    { enabled: projectId > 0, refetchInterval: (query) => {
      const status = query.state.data?.status;
      return (status === "processing" || status === "post_processing") ? 2000 : false;
    }}
  );

  // Track previous processing status to detect completion transition
  const prevStatusRef = useRef<string | null>(null);

  // Auto-switch to items tab when processing completes & refetch items
  useEffect(() => {
    const currentStatus = progress?.status || project?.status;
    const prevStatus = prevStatusRef.current;
    prevStatusRef.current = currentStatus || null;

    // Detect transition: was processing/post_processing, now completed
    if (prevStatus && prevStatus !== "completed" && currentStatus === "completed") {
      // Play completion chime and send browser notification
      playCompletionChime();
      sendCompletionNotification(project?.name || "Project");
      
      if (prevStatus === "post_processing") {
        // Hard refresh for consolidation to ensure all data is fresh
        toast.success("Consolidation complete! Refreshing data...");
        setTimeout(() => window.location.reload(), 500);
      } else {
        // Regular refetch for initial analysis
        refetchItems().then(() => {
          setActiveTab("items");
          toast.success("Analysis complete! Showing your quantity takeoff.");
        });
      }
    }
  }, [progress?.status, project?.status, refetchItems]);

  // ─── Mutations ────────────────────────────────────────────────────────────

  const uploadMutation = trpc.takeoff.uploadSheet.useMutation({
    onSuccess: () => {
      refetchProject();
      refetchProgress();
    },
    onError: (err) => toast.error(`Upload failed: ${err.message}`),
  });

  const processMutation = trpc.takeoff.startProcessing.useMutation({
    onSuccess: () => {
      toast.success("ConstructLine takeoff started! This may take a few minutes...");
      refetchProject();
      refetchProgress();
    },
    onError: (err) => toast.error(err.message),
  });

  const reprocessMutation = trpc.takeoff.reprocessSheet.useMutation({
    onSuccess: () => {
      toast.success("Reprocessing sheet...");
      refetchProject();
      refetchProgress();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateItemMutation = trpc.takeoff.updateItem.useMutation({
    onSuccess: () => {
      toast.success("Item updated");
      setEditingItem(null);
      refetchItems();
      refetchProject();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteItemMutation = trpc.takeoff.deleteItem.useMutation({
    onSuccess: () => {
      toast.success("Item deleted");
      refetchItems();
      refetchProject();
    },
    onError: (err) => toast.error(err.message),
  });

  const bulkReviewMutation = trpc.takeoff.bulkReview.useMutation({
    onSuccess: () => {
      toast.success("All items marked as reviewed");
      refetchItems();
    },
    onError: (err) => toast.error(err.message),
  });

  const bulkUnreviewMutation = trpc.takeoff.bulkUnreview.useMutation({
    onSuccess: () => {
      toast.success("All items marked as unreviewed");
      refetchItems();
    },
    onError: (err) => toast.error(err.message),
  });

  const settingsMutation = trpc.takeoff.updateProjectSettings.useMutation({
    onSuccess: () => {
      refetchProject();
    },
    onError: (err) => toast.error(`Settings error: ${err.message}`),
  });

  const addItemMutation = trpc.takeoff.addItem.useMutation({
    onSuccess: () => {
      toast.success("Item added");
      setShowAddItem(false);
      refetchItems();
      refetchProject();
    },
    onError: (err) => toast.error(err.message),
  });

  const consolidateMutation = trpc.takeoff.reprocessConsolidate.useMutation({
    onSuccess: () => {
      toast.success("Consolidate & Enhance started! This may take a minute...");
      // The backend sets status to post_processing, which triggers polling via refetchInterval.
      // The prevStatusRef effect above will detect post_processing → completed and auto-refresh items.
      refetchProject();
      refetchProgress();
    },
    onError: (err) => toast.error(`Consolidation error: ${err.message}`),
  });

  // Derived: is consolidation specifically running?
  const isConsolidating = (progress?.status === "post_processing" || project?.status === "post_processing");

  // ─── File Upload Handler ──────────────────────────────────────────────────

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);

    try {
      const existingSheetCount = project?.sheets?.length || 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validate file type
        if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
          toast.error(`Unsupported file type: ${file.name}. Use PNG, JPG, or PDF.`);
          continue;
        }

        // For images, upload directly
        if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve, reject) => {
            reader.onload = () => {
              const result = reader.result as string;
              resolve(result.split(",")[1]); // Remove data:image/...;base64, prefix
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          await uploadMutation.mutateAsync({
            projectId,
            filename: file.name,
            pageNumber: existingSheetCount + i + 1,
            imageData: base64,
            contentType: file.type,
          });

          toast.success(`Uploaded: ${file.name}`);
        } else if (file.type === "application/pdf") {
          // For PDFs, we'll convert pages to images client-side using canvas
          toast.info(`Processing PDF: ${file.name}. Converting pages to images...`);
          await handlePdfUpload(file, existingSheetCount);
        }
      }

      refetchProject();
      refetchProgress();
    } catch (err: any) {
      toast.error(`Upload error: ${err.message}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [projectId, project, uploadMutation]);

  const handlePdfUpload = async (file: File, startPage: number) => {
    // Use pdf.js to render PDF pages to images
    // Worker file is copied to public/ dir so it's served as a static asset
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;

    toast.info(`Found ${numPages} pages in ${file.name}`);

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const scale = 2.0; // High resolution for ConstructLine analysis
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;

        await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;

        // Convert to base64 PNG
        const dataUrl = canvas.toDataURL("image/png");
        const base64 = dataUrl.split(",")[1];

        await uploadMutation.mutateAsync({
          projectId,
          filename: `${file.name} - Page ${pageNum}`,
          pageNumber: startPage + pageNum,
          imageData: base64,
          contentType: "image/png",
        });

        toast.success(`Uploaded page ${pageNum}/${numPages}`);
      } catch (err: any) {
        toast.error(`Failed to process page ${pageNum}: ${err.message}`);
      }
    }
  };

  // ─── Drag & Drop ──────────────────────────────────────────────────────────

  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  }, [handleFileUpload]);

  //  // ─── Excel/CSV Export ──────────────────────────────────────────────────

  const handleExportExcel = useCallback(() => {
    if (!items || items.length === 0) return;

    const currencyCode = project?.currency || "USD";
    const currencySymbol = currencyCode === "GBP" ? "£" : currencyCode === "AUD" ? "A$" : "$";

    // Group items by CSI division
    const divGroups: Record<string, any[]> = {};
    for (const item of items as any[]) {
      const div = item.csiDivision || "00";
      if (!divGroups[div]) divGroups[div] = [];
      divGroups[div].push(item);
    }
    const sortedDivs = Object.keys(divGroups).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    // Build rows with branding header and CSI division headers and subtotals
    const projectName = (project as any)?.name || "Takeoff";
    const exportDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const headers = ["CSI Code", "Description", "Quantity", "Unit", `Unit Cost (${currencySymbol})`, `Extended Cost (${currencySymbol})`, "Confidence %", "Reviewed", "Notes"];
    const aoa: any[][] = [
      ["ConstructLine | Powered by ALP", "", "", "", "", "", "", "", ""],
      [`Project: ${projectName}`, "", "", `Date: ${exportDate}`, "", "", `Currency: ${currencyCode}`, "", ""],
      [], // blank separator
      headers,
    ];
    let grandTotal = 0;

    for (const div of sortedDivs) {
      const divName = CSI_DIVISION_NAMES[div] || `Division ${div}`;
      // Division header row
      aoa.push([`${div} — ${divName}`, "", "", "", "", "", "", "", ""]);
      let divTotal = 0;
      for (const item of divGroups[div]) {
        const extCost = (parseFloat(item.extendedCost) || 0) / 100;
        divTotal += extCost;
        aoa.push([
          item.csiCode || item.csiDivision || "",
          item.description || "",
          parseFloat(item.quantity) || 0,
          item.unit || "",
          (parseFloat(item.unitCost) || 0) / 100,
          extCost,
          item.confidence || 0,
          item.reviewed ? "Yes" : "No",
          item.notes || "",
        ]);
      }
      // Division subtotal row
      aoa.push(["", `Subtotal — ${divName}`, "", "", "", divTotal, "", "", ""]);
      // Blank separator row
      aoa.push([]);
      grandTotal += divTotal;
    }
    // Grand total row
    aoa.push(["", "GRAND TOTAL", "", "", "", grandTotal, "", "", ""]);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [{ wch: 14 }, { wch: 55 }, { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 10 }, { wch: 40 }];

    // Style branding rows
    const brandCell = XLSX.utils.encode_cell({ r: 0, c: 0 });
    if (ws[brandCell]) ws[brandCell].s = { font: { bold: true, sz: 16, color: { rgb: "0D1B2A" } } };
    const projCell = XLSX.utils.encode_cell({ r: 1, c: 0 });
    if (ws[projCell]) ws[projCell].s = { font: { bold: true, sz: 11 } };
    const dateCell = XLSX.utils.encode_cell({ r: 1, c: 3 });
    if (ws[dateCell]) ws[dateCell].s = { font: { sz: 11 } };
    const currCell = XLSX.utils.encode_cell({ r: 1, c: 6 });
    if (ws[currCell]) ws[currCell].s = { font: { sz: 11 } };

    // Style division headers and subtotals (bold via cell formatting)
    let rowIdx = 4; // skip branding (0), project info (1), blank (2), headers (3)
    for (const div of sortedDivs) {
      // Division header row
      const headerCell = XLSX.utils.encode_cell({ r: rowIdx, c: 0 });
      if (ws[headerCell]) ws[headerCell].s = { font: { bold: true, sz: 12 }, fill: { fgColor: { rgb: "F5F0E8" } } };
      rowIdx += 1 + divGroups[div].length;
      // Subtotal row
      const subtotalCell = XLSX.utils.encode_cell({ r: rowIdx, c: 1 });
      if (ws[subtotalCell]) ws[subtotalCell].s = { font: { bold: true } };
      rowIdx += 2; // subtotal + blank
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Quantity Takeoff");
    const fileName = `${(project as any)?.name || "Takeoff"}_Quantities_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success("Exported to Excel — grouped by CSI division");
  }, [items, project]);

  const handleExportCsv = useCallback(() => {
    if (!items || items.length === 0) return;
    const currencyCode = project?.currency || "USD";
    const currencySymbol = currencyCode === "GBP" ? "£" : currencyCode === "AUD" ? "A$" : "$";
    const headers = ["CSI Code", "Description", "Quantity", "Unit", `Unit Cost (${currencySymbol})`, `Extended Cost (${currencySymbol})`, "Confidence %", "Reviewed", "Notes"];

    // Group by CSI division
    const divGroups: Record<string, any[]> = {};
    for (const item of items as any[]) {
      const div = item.csiDivision || "00";
      if (!divGroups[div]) divGroups[div] = [];
      divGroups[div].push(item);
    }
    const sortedDivs = Object.keys(divGroups).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    const projectName = (project as any)?.name || "Takeoff";
    const exportDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const csvRows: string[] = [
      `"ConstructLine | Powered by ALP","","","","","","","",""`,
      `"Project: ${projectName.replace(/"/g, '""')}","","","Date: ${exportDate}","","","Currency: ${currencyCode}","",""`,
      "",
      headers.join(","),
    ];
    let grandTotal = 0;

    for (const div of sortedDivs) {
      const divName = CSI_DIVISION_NAMES[div] || `Division ${div}`;
      // Division header row
      csvRows.push(`"${div} \u2014 ${divName}","","","","","","","",""`);
      let divTotal = 0;
      for (const item of divGroups[div]) {
        const extCost = (parseFloat(item.extendedCost) || 0) / 100;
        divTotal += extCost;
        csvRows.push([
          item.csiCode || item.csiDivision || "",
          `"${(item.description || "").replace(/"/g, '""')}"`,
          parseFloat(item.quantity) || 0,
          item.unit || "",
          ((parseFloat(item.unitCost) || 0) / 100).toFixed(2),
          extCost.toFixed(2),
          item.confidence || 0,
          item.reviewed ? "Yes" : "No",
          `"${(item.notes || "").replace(/"/g, '""')}"`,
        ].join(","));
      }
      // Division subtotal
      csvRows.push(`"","Subtotal \u2014 ${divName}","","","",${divTotal.toFixed(2)},"","",""`);
      csvRows.push(""); // blank separator
      grandTotal += divTotal;
    }
    csvRows.push(`"","GRAND TOTAL","","","",${grandTotal.toFixed(2)},"","",""`);

    const csv = csvRows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(project as any)?.name || "Takeoff"}_Quantities_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported to CSV \u2014 grouped by CSI division");
  }, [items, project]);

  // ─── Grouped Items ──────────────────────────────────────────────────

  const groupedItems = useMemo(() => {
    if (!items) return {};
    const groups: Record<string, typeof items> = {};
    for (const item of items) {
      const div = (item as any).csiDivision || "00";
      if (!groups[div]) groups[div] = [];
      groups[div].push(item);
    }
    return groups;
  }, [items]);

  const toggleDivision = (div: string) => {
    setCollapsedDivisions((prev) => {
      const next = new Set(prev);
      if (next.has(div)) next.delete(div);
      else next.add(div);
      return next;
    });
  };

  // ─── Loading State ────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <p className="text-cream-muted">Project not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/portal/takeoff")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Projects
        </Button>
      </div>
    );
  }

  const sheets = project.sheets || [];
  const isProcessing = progress?.status === "processing" || progress?.status === "post_processing";
  const hasPendingSheets = sheets.some((s: any) => s.status === "pending");
  const totalCost = project.totalEstimatedCost || 0;

  return (
    <div className="min-h-screen bg-navy-deep">
      {/* Header Bar */}
      <div className="bg-navy-medium/80 border-b border-white/10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/portal/takeoff")}
              className="text-cream-muted hover:text-cream"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <div className="w-px h-6 bg-white/10" />
            {/* ConstructLine Brand Mark */}
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-white leading-tight">Construct<span className="text-amber-400">Line</span></span>
              <span className="text-[8px] text-gray-500 tracking-wider uppercase leading-tight">Powered by ALP</span>
            </div>
            <div className="w-px h-6 bg-white/10" />
            <div>
              <h1 className="text-lg font-bold text-cream">{project.name}</h1>
              {project.description && (
                <p className="text-xs text-cream-muted">{project.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {totalCost > 0 && (
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 font-bold text-lg">
                  {formatCurrency(totalCost, project?.currency || "USD")}
                </span>
                <span className="text-emerald-400/60 text-xs">estimated</span>
              </div>
            )}
            <div data-tour="takeoff-settings">
            <ProjectSettingsPanel
              projectId={projectId}
              currentDivisions={project.selectedDivisions ? JSON.parse(project.selectedDivisions) : null}
              currentRegion={project.costRegion}
              currentCurrency={project.currency}
              currentScopeText={project.scopeText}
              currentSpecialties={project.selectedSpecialties ? JSON.parse(project.selectedSpecialties) : null}
              detectedSpecialties={project.detectedSpecialties ? JSON.parse(project.detectedSpecialties) : null}
              hasProcessedSheets={sheets.some((s: any) => s.status === "completed")}
              onSave={async (divisions, region, currency, scopeText, specialties) => {
                return new Promise<{ regionChanged?: boolean }>((resolve, reject) => {
                  settingsMutation.mutate(
                    {
                      projectId,
                      selectedDivisions: divisions || [],
                      costRegion: region,
                      currency: currency as any,
                      ...(scopeText !== undefined ? { scopeText } : {}),
                      ...(specialties !== undefined ? { selectedSpecialties: specialties } : {}),
                    },
                    {
                      onSuccess: (result) => resolve(result),
                      onError: (err) => reject(err),
                    },
                  );
                });
              }}
              onReAnalyze={(divisions) => {
                // Re-analyze with updated divisions — triggers startProcessing
                processMutation.mutate({
                  projectId,
                  selectedDivisions: divisions || [],
                  currency: (project.currency || "USD") as "USD" | "GBP" | "AUD",
                  costRegion: project.costRegion || null,
                  scopeText: project.scopeText || null,
                  selectedSpecialties: project.selectedSpecialties ? JSON.parse(project.selectedSpecialties) : null,
                });
              }}
            />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList data-tour="takeoff-tabs" className="bg-navy-medium/50 border border-white/10 mb-6">
            <TabsTrigger value="sheets" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
              <FileStack className="w-4 h-4 mr-2" />
              Drawing Sheets ({sheets.length})
            </TabsTrigger>
            <TabsTrigger value="items" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
              <DollarSign className="w-4 h-4 mr-2" />
              Quantity Takeoff ({items?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* ─── Sheets Tab ──────────────────────────────────────────────── */}
          <TabsContent value="sheets">
            {/* Upload Area */}
            <div
              data-tour="takeoff-upload-area"
              className={`border-2 border-dashed rounded-xl p-8 mb-6 text-center transition-all ${
                dragOver
                  ? "border-amber-500 bg-amber-500/10"
                  : "border-white/20 hover:border-white/40 bg-navy-medium/30"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                multiple
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files)}
              />
              <div className="flex flex-col items-center gap-3">
                {uploading ? (
                  <>
                    <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
                    <p className="text-cream font-medium">Uploading drawings...</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-cream-muted" />
                    <div>
                      <p className="text-cream font-medium">
                        Drag & drop construction drawings here
                      </p>
                      <p className="text-cream-muted text-sm mt-1">
                        Supports PDF (multi-page) and images (PNG, JPG). Each page is analyzed separately.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-2"
                    >
                      <FileImage className="w-4 h-4 mr-2" />
                      Browse Files
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Analyze Drawings Button — opens Pre-Analysis Modal */}
            {/* Shows when: sheets exist AND not currently processing */}
            {sheets.length > 0 && !isProcessing && (
              <div className="mb-6">
                <Button
                  data-tour="takeoff-analyze-btn"
                  onClick={() => setShowPreAnalysis(true)}
                  disabled={processMutation.isPending}
                  className={`w-full font-semibold py-6 text-lg shadow-lg ${
                    hasPendingSheets
                      ? "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
                      : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                  }`}
                >
                  {processMutation.isPending && (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  )}
                  {hasPendingSheets
                    ? <><span className="font-bold tracking-tight"><span className="text-white">Construct</span><span className="text-amber-300">Line</span></span>{" "}Analyze Drawings</>
                    : <><span className="font-bold tracking-tight"><span className="text-white">Construct</span><span className="text-amber-300">Line</span></span>{" "}Re-Analyze Drawings</>}
                  <span className="ml-2 text-sm opacity-75">
                    ({hasPendingSheets
                      ? `${sheets.filter((s: any) => s.status === "pending").length} sheets to analyze`
                      : `${sheets.length} sheets — update settings & re-run`})
                  </span>
                </Button>
              </div>
            )}

            {/* Pre-Analysis Modal */}
            <PreAnalysisModal
              open={showPreAnalysis}
              onClose={() => setShowPreAnalysis(false)}
              onConfirm={(settings: PreAnalysisSettings) => {
                setShowPreAnalysis(false);
                // Save preferred currency for next time
                savePreferredCurrency.mutate({ currency: settings.currency });
                processMutation.mutate({
                  projectId,
                  currency: settings.currency,
                  costRegion: settings.costRegion,
                  selectedDivisions: settings.selectedDivisions,
                  scopeText: settings.scopeText || null,
                  selectedSpecialties: settings.selectedSpecialties.length > 0 ? settings.selectedSpecialties : null,
                });
              }}
              pendingSheetCount={sheets.filter((s: any) => s.status === "pending").length || sheets.length}
              isSubmitting={processMutation.isPending}
              existingDivisions={project.selectedDivisions ? JSON.parse(project.selectedDivisions) : null}
              existingRegion={project.costRegion}
              existingCurrency={project.currency}
              preferredCurrency={preferredCurrencyQuery.data?.currency}
              existingScopeText={project.scopeText}
              existingSpecialties={project.selectedSpecialties ? JSON.parse(project.selectedSpecialties) : null}
              detectedSpecialties={project.detectedSpecialties ? JSON.parse(project.detectedSpecialties) : null}
            />

            {/* Processing Overlay — animated construction-themed progress */}
            {isProcessing && progress && (
              <div className="mb-6">
                <ProcessingOverlay
                  totalSheets={progress.totalSheets}
                  processedSheets={progress.processedSheets}
                  projectStatus={progress.status}
                  sheets={sheets.map((s: any) => ({
                    id: s.id,
                    sheetName: s.sheetName,
                    pageNumber: s.pageNumber,
                    status: s.status,
                  }))}
                />
              </div>
            )}

            {/* Sheet Grid */}
            {sheets.length > 0 ? (
              <div data-tour="takeoff-sheet-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {sheets.map((sheet: any) => {
                  const statusConfig = SHEET_STATUS_CONFIG[sheet.status] || SHEET_STATUS_CONFIG.pending;
                  const StatusIcon = statusConfig.icon;
                  return (
                    <Card
                      key={sheet.id}
                      className="bg-navy-medium/50 border-white/10 overflow-hidden group hover:border-amber-500/30 transition-all"
                    >
                      {/* Sheet Thumbnail */}
                      <div
                        className="aspect-[4/3] bg-navy-deep/50 relative cursor-pointer"
                        onClick={() => setPreviewSheet(sheet)}
                      >
                        {sheet.imageUrl ? (
                          <img
                            src={sheet.imageUrl}
                            alt={sheet.sheetName || `Page ${sheet.pageNumber}`}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FileImage className="w-12 h-12 text-cream-muted/30" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <Eye className="w-8 h-8 text-white" />
                        </div>
                        <div className="absolute top-2 right-2">
                          <Badge className={`${statusConfig.color} text-xs flex items-center gap-1`}>
                            <StatusIcon className={`w-3 h-3 ${sheet.status === "processing" ? "animate-spin" : ""}`} />
                            {statusConfig.label}
                          </Badge>
                        </div>
                      </div>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                            <p className="text-cream text-sm font-medium truncate">
                              {sheet.sheetName || `Page ${sheet.pageNumber}`}
                            </p>
                            {sheet.sheetType && sheet.sheetType !== "other" && (
                              <p className="text-cream-muted text-xs capitalize">
                                {sheet.sheetType.replace(/_/g, " ")}
                              </p>
                            )}
                          </div>
                          {(sheet.status === "error" || sheet.status === "completed") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-cream-muted hover:text-amber-400"
                              onClick={() =>
                                reprocessMutation.mutate({
                                  sheetId: sheet.id,
                                  projectId,
                                })
                              }
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                        {sheet.errorMessage && (
                          <p className="text-red-400 text-xs mt-1 line-clamp-2">
                            {sheet.errorMessage}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-cream-muted">
                <FileStack className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No drawing sheets uploaded yet. Upload PDF or image files above.</p>
              </div>
            )}
          </TabsContent>

          {/* ─── Quantity Items Tab ──────────────────────────────────────── */}
          <TabsContent value="items">
            {/* Consolidation Processing Overlay — full visual stepper */}
            {isConsolidating && progress && (
              <div className="mb-6">
                <ProcessingOverlay
                  totalSheets={progress.totalSheets}
                  processedSheets={progress.processedSheets}
                  projectStatus={progress.status}
                  sheets={sheets.map((s: any) => ({
                    id: s.id,
                    sheetName: s.sheetName,
                    pageNumber: s.pageNumber,
                    status: s.status,
                  }))}
                />
              </div>
            )}
            {!items || items.length === 0 ? (
              <div className="text-center py-16 text-cream-muted">
                <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg">No quantity items yet.</p>
                <p className="text-sm mt-1">
                  Upload drawings and run <span className="font-semibold"><span className="text-white">Construct</span><span className="text-amber-400">Line</span></span> analysis to extract quantities.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary Bar */}
                <div data-tour="takeoff-summary-bar" className="flex flex-wrap items-center justify-between gap-3 bg-navy-medium/50 border border-white/10 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-6 text-sm text-cream-muted">
                    <span>{items.length} line items</span>
                    <span>{Object.keys(groupedItems).length} CSI divisions</span>
                    <span>
                      {items.filter((i: any) => i.reviewed).length} reviewed
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-cream-muted text-sm">Total:</span>
                      <span className="text-amber-400 font-bold text-xl">
                        {formatCurrency(totalCost, project?.currency || "USD")}
                      </span>
                    </div>
                    <div className="w-px h-6 bg-white/10" />
                    <div className="relative group">
                      <Button
                        data-tour="takeoff-consolidate-btn"
                        size="sm"
                        variant="outline"
                        onClick={() => consolidateMutation.mutate({ projectId })}
                        disabled={consolidateMutation.isPending || isProcessing}
                        className="h-8 text-xs gap-1.5 border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
                      >
                        {consolidateMutation.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5" />
                        )}
                        Consolidate & Enhance
                      </Button>
                      <div className="absolute top-full left-0 mt-2 w-72 p-3 bg-navy-deep border border-amber-500/20 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                        <p className="text-amber-400 text-xs font-semibold mb-1.5">AI Post-Processing</p>
                        <ul className="text-cream-muted text-[11px] space-y-1">
                          <li>• Merges duplicate items from different sheets</li>
                          <li>• Converts lump sums to measured quantities using plan dimensions</li>
                          <li>• Calculates concrete volumes (CY) from dimensions</li>
                          <li>• Generates formwork items for concrete elements</li>
                          <li>• Removes items outside your defined scope</li>
                        </ul>
                        <p className="text-cream-muted/50 text-[10px] mt-2">Drawings are not re-read — only existing data is refined.</p>
                      </div>
                    </div>
                    <div className="w-px h-6 bg-white/10" />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleExportExcel}
                      disabled={!items || items.length === 0}
                      className="h-8 text-xs gap-1.5 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                      title="Export to Excel (.xlsx)"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      Excel
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleExportCsv}
                      disabled={!items || items.length === 0}
                      className="h-8 text-xs gap-1.5 border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
                      title="Export to CSV"
                    >
                      <Download className="w-3.5 h-3.5" />
                      CSV
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowRollup(true)}
                      disabled={!projectMarkups || projectMarkups.length === 0}
                      className="h-8 text-xs gap-1.5 border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
                      title="View measurement rollup across all sheets"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      Measurements
                    </Button>
                    <div className="w-px h-6 bg-white/10" />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowAddItem(true)}
                      className="h-8 text-xs gap-1.5 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                      title="Add a manual line item"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      Add Item
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowMarkup(!showMarkup)}
                      className={`h-8 text-xs gap-1.5 ${
                        showMarkup
                          ? "border-amber-500/50 text-amber-400 bg-amber-500/10"
                          : "border-purple-500/30 text-purple-400 hover:bg-purple-500/10 hover:text-purple-300"
                      }`}
                      title="Bid Markup Calculator"
                    >
                      <Calculator className="w-3.5 h-3.5" />
                      Bid Calculator
                    </Button>
                  </div>
                </div>

                {/* ─── Markup Calculator Panel ─────────────────────────────── */}
                {showMarkup && (() => {
                  const materialTotal = totalCost / 100; // cents to dollars
                  const laborAmt = materialTotal * (markups.labor / 100);
                  const subtotalWithLabor = materialTotal + laborAmt;
                  const overheadAmt = subtotalWithLabor * (markups.overhead / 100);
                  const profitAmt = subtotalWithLabor * (markups.profit / 100);
                  const bondsAmt = subtotalWithLabor * (markups.bonds / 100);
                  const contingencyAmt = subtotalWithLabor * (markups.contingency / 100);
                  const grandTotal = subtotalWithLabor + overheadAmt + profitAmt + bondsAmt + contingencyAmt;
                  const totalMarkupPct = materialTotal > 0 ? ((grandTotal - materialTotal) / materialTotal * 100) : 0;
                  const curr = project?.currency || "USD";
                  const fmtDollars = (v: number) => new Intl.NumberFormat(
                    CURRENCY_LOCALE[curr] || "en-US",
                    { style: "currency", currency: curr, minimumFractionDigits: 0, maximumFractionDigits: 0 }
                  ).format(v);

                  return (
                    <div className="bg-navy-medium/60 border border-purple-500/20 rounded-lg p-5 mb-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Calculator className="w-4 h-4 text-purple-400" />
                        <h3 className="text-cream font-semibold text-sm">Bid Markup Calculator</h3>
                        <span className="text-cream-muted text-xs ml-auto">Adjust percentages to build your full bid number</span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-5">
                        {[
                          { key: "labor" as const, label: "Labor", hint: "Labor cost as % of material" },
                          { key: "overhead" as const, label: "Overhead", hint: "Office, insurance, etc." },
                          { key: "profit" as const, label: "Profit", hint: "Your margin" },
                          { key: "bonds" as const, label: "Bonds", hint: "Performance & payment bonds" },
                          { key: "contingency" as const, label: "Contingency", hint: "Risk buffer" },
                        ].map(({ key, label, hint }) => (
                          <div key={key}>
                            <Label className="text-cream-muted text-xs mb-1 block">{label}</Label>
                            <div className="relative">
                              <Input
                                type="number"
                                min={0}
                                max={500}
                                step={1}
                                value={markups[key] || ""}
                                onChange={(e) => setMarkups(prev => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))}
                                className="h-9 bg-navy-deep/80 border-white/10 text-cream text-sm pr-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                placeholder="0"
                              />
                              <Percent className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cream-muted/50" />
                            </div>
                            <p className="text-cream-muted/50 text-[10px] mt-0.5">{hint}</p>
                          </div>
                        ))}
                      </div>

                      <div className="border-t border-white/10 pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 text-sm">
                          <div className="flex justify-between py-1">
                            <span className="text-cream-muted">Material Takeoff Total</span>
                            <span className="text-cream font-mono">{fmtDollars(materialTotal)}</span>
                          </div>
                          {markups.labor > 0 && (
                            <div className="flex justify-between py-1">
                              <span className="text-cream-muted">+ Labor ({markups.labor}%)</span>
                              <span className="text-cream font-mono">{fmtDollars(laborAmt)}</span>
                            </div>
                          )}
                          {markups.overhead > 0 && (
                            <div className="flex justify-between py-1">
                              <span className="text-cream-muted">+ Overhead ({markups.overhead}%)</span>
                              <span className="text-cream font-mono">{fmtDollars(overheadAmt)}</span>
                            </div>
                          )}
                          {markups.profit > 0 && (
                            <div className="flex justify-between py-1">
                              <span className="text-cream-muted">+ Profit ({markups.profit}%)</span>
                              <span className="text-cream font-mono">{fmtDollars(profitAmt)}</span>
                            </div>
                          )}
                          {markups.bonds > 0 && (
                            <div className="flex justify-between py-1">
                              <span className="text-cream-muted">+ Bonds ({markups.bonds}%)</span>
                              <span className="text-cream font-mono">{fmtDollars(bondsAmt)}</span>
                            </div>
                          )}
                          {markups.contingency > 0 && (
                            <div className="flex justify-between py-1">
                              <span className="text-cream-muted">+ Contingency ({markups.contingency}%)</span>
                              <span className="text-cream font-mono">{fmtDollars(contingencyAmt)}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-amber-500/20">
                          <div>
                            <span className="text-amber-400 font-bold text-lg">Bid Total</span>
                            {totalMarkupPct > 0 && (
                              <span className="text-cream-muted text-xs ml-2">(+{totalMarkupPct.toFixed(1)}% over material)</span>
                            )}
                          </div>
                          <span className="text-amber-400 font-bold text-2xl font-mono">{fmtDollars(grandTotal)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Items by CSI Division */}
                {Object.entries(groupedItems)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([division, divItems]) => {
                    const isCollapsed = collapsedDivisions.has(division);
                    const divTotal = (divItems as any[]).reduce(
                      (sum: number, item: any) => sum + (item.extendedCost || 0),
                      0
                    );
                    const divName = CSI_DIVISION_NAMES[division] || `Division ${division}`;

                    const divReviewedCount = (divItems as any[]).filter((i: any) => i.reviewed).length;
                    const divItemCount = (divItems as any[]).length;
                    const allReviewed = divReviewedCount === divItemCount;

                    return (
                      <div key={division} className="border border-white/10 rounded-lg overflow-hidden">
                        {/* Division Header */}
                        <div className="flex items-center justify-between px-4 py-3 bg-navy-medium/70">
                          <button
                            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                            onClick={() => toggleDivision(division)}
                          >
                            {isCollapsed ? (
                              <ChevronRight className="w-4 h-4 text-cream-muted" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-cream-muted" />
                            )}
                            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 font-mono">
                              {division}
                            </Badge>
                            <span className="text-cream font-semibold">{divName}</span>
                            <span className="text-cream-muted text-sm">
                              ({divItemCount} items)
                            </span>
                            {divReviewedCount > 0 && (
                              <Badge className={`text-xs ${
                                allReviewed
                                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                  : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                              }`}>
                                {allReviewed ? "All Reviewed" : `${divReviewedCount}/${divItemCount} reviewed`}
                              </Badge>
                            )}
                          </button>
                          <div className="flex items-center gap-3">
                            {allReviewed ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs gap-1.5 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                                onClick={() => bulkUnreviewMutation.mutate({ projectId, csiDivision: division })}
                                disabled={bulkUnreviewMutation.isPending}
                              >
                                <Square className="w-3.5 h-3.5" />
                                Unreview All
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs gap-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                                onClick={() => bulkReviewMutation.mutate({ projectId, csiDivision: division })}
                                disabled={bulkReviewMutation.isPending}
                              >
                                <CheckSquare className="w-3.5 h-3.5" />
                                Review All
                              </Button>
                            )}
                            <span className="text-amber-400 font-semibold">
                              {formatCurrency(divTotal, project?.currency || "USD")}
                            </span>
                          </div>
                        </div>

                        {/* Division Items Table */}
                        {!isCollapsed && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-navy-deep/50 text-cream-muted text-xs uppercase">
                                  <th className="text-left px-4 py-2 w-12">CSI</th>
                                  <th className="text-left px-4 py-2">Description</th>
                                  <th className="text-right px-4 py-2 w-20">Qty</th>
                                  <th className="text-left px-4 py-2 w-14">Unit</th>
                                  <th className="text-right px-4 py-2 w-24">Unit Cost</th>
                                  <th className="text-right px-4 py-2 w-28">Extended</th>
                                  <th className="text-center px-4 py-2 w-16">Conf.</th>
                                  <th className="text-center px-4 py-2 w-16">Verified</th>
                                  <th className="text-center px-4 py-2 w-20">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(divItems as any[]).map((item: any) => (
                                  <tr
                                    key={item.id}
                                    className={`border-t border-white/5 hover:bg-white/5 transition-colors cursor-pointer ${
                                      item.reviewed ? "bg-emerald-500/5" : ""
                                    }`}
                                    onClick={() => setSelectedItem(item)}
                                  >
                                    <td className="px-4 py-2 text-cream-muted font-mono text-xs">
                                      <div className="flex items-center gap-1">
                                        {item.reviewed && <Check className="w-3 h-3 text-emerald-400 shrink-0" />}
                                        {item.csiCode || item.csiDivision}
                                      </div>
                                    </td>
                                    <td className="px-4 py-2 text-cream max-w-xs">
                                      <p className="line-clamp-2">{item.description}</p>
                                      {item.notes && (
                                        <p className="text-cream-muted text-xs mt-0.5 line-clamp-1">
                                          {item.notes}
                                        </p>
                                      )}
                                    </td>
                                    <td className="px-4 py-2 text-right text-cream font-mono">
                                      {parseFloat(item.quantity).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-2 text-cream-muted">{item.unit}</td>
                                    <td className="px-4 py-2 text-right text-cream font-mono">
                                      {formatCurrency(item.unitCost, project?.currency || "USD")}
                                    </td>
                                    <td className="px-4 py-2 text-right text-amber-400 font-semibold font-mono">
                                      {formatCurrency(item.extendedCost, project?.currency || "USD")}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                      <Badge
                                        className={`text-xs ${
                                          item.confidence >= 80
                                            ? "bg-emerald-500/20 text-emerald-400"
                                            : item.confidence >= 50
                                            ? "bg-amber-500/20 text-amber-400"
                                            : "bg-red-500/20 text-red-400"
                                        }`}
                                      >
                                        {item.confidence}%
                                      </Badge>
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                      {item.reviewed ? (
                                        <div className="flex items-center justify-center" title="Reviewed & Verified">
                                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                                        </div>
                                      ) : (
                                        <span className="text-cream-muted/30">—</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                                      <div className="flex items-center justify-center gap-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0 text-cream-muted hover:text-amber-400"
                                          onClick={() => setSelectedItem(item)}
                                          title="View details"
                                        >
                                          <Eye className="w-3 h-3" />
                                        </Button>
                                        {!item.reviewed && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 text-cream-muted hover:text-emerald-400"
                                            onClick={() =>
                                              updateItemMutation.mutate({
                                                id: item.id,
                                                projectId,
                                                reviewed: true,
                                              })
                                            }
                                          >
                                            <Check className="w-3 h-3" />
                                          </Button>
                                        )}
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0 text-cream-muted hover:text-red-400"
                                          onClick={() =>
                                            deleteItemMutation.mutate({
                                              id: item.id,
                                              projectId,
                                            })
                                          }
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ─── Sheet Preview Modal ─────────────────────────────────────────── */}
      <Dialog open={!!previewSheet} onOpenChange={() => setPreviewSheet(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {previewSheet?.sheetName || `Page ${previewSheet?.pageNumber}`}
            </DialogTitle>
            <DialogDescription>
              {previewSheet?.sheetType && previewSheet.sheetType !== "other"
                ? previewSheet.sheetType.replace(/_/g, " ")
                : "Drawing sheet preview"}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-auto max-h-[70vh]">
            {previewSheet?.imageUrl && (
              <img
                src={previewSheet.imageUrl}
                alt={previewSheet.sheetName || "Drawing"}
                className="w-full h-auto"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Edit Item Modal (legacy, kept for fallback) ───────────────── */}
      <EditItemDialog
        item={editingItem}
        projectId={projectId}
        onClose={() => setEditingItem(null)}
        onSave={(data) => updateItemMutation.mutate(data)}
        isPending={updateItemMutation.isPending}
        currencyCode={project?.currency || "USD"}
      />

      {/* ─── Item Detail Modal ──────────────────────────────────────────── */}
      {(() => {
        // Build flat item list for prev/next navigation
        const allItems = items
          ? Object.entries(
              (items as any[]).reduce((acc: Record<string, any[]>, item: any) => {
                const div = item.csiDivision || "Other";
                if (!acc[div]) acc[div] = [];
                acc[div].push(item);
                return acc;
              }, {})
            )
              .sort(([a], [b]) => a.localeCompare(b))
              .flatMap(([, divItems]) => divItems as any[])
          : [];
        const selectedIdx = selectedItem
          ? allItems.findIndex((i: any) => i.id === selectedItem.id)
          : -1;
        // Look up source sheet for the selected item
        const sourceSheet = selectedItem?.sheetId
          ? sheets.find((s: any) => s.id === selectedItem.sheetId) || null
          : null;
        return (
          <ItemDetailModal
            item={selectedItem}
            projectId={projectId}
            currencyCode={project?.currency || "USD"}
            sourceSheet={sourceSheet}
            onClose={() => setSelectedItem(null)}
            onSave={(data) => {
              updateItemMutation.mutate(data);
              // Update selectedItem in place so modal reflects changes
              setSelectedItem((prev: any) => prev ? { ...prev, ...data, unitCost: data.unitCost, extendedCost: Math.round(parseFloat(data.quantity || "0") * (data.unitCost || 0)) } : null);
            }}
            onDelete={(data) => {
              deleteItemMutation.mutate(data);
              setSelectedItem(null);
            }}
            onMarkReviewed={(data) => {
              updateItemMutation.mutate(data);
              setSelectedItem((prev: any) => prev ? { ...prev, reviewed: true } : null);
            }}
            isPending={updateItemMutation.isPending}
            hasPrev={selectedIdx > 0}
            hasNext={selectedIdx >= 0 && selectedIdx < allItems.length - 1}
            onPrev={() => {
              if (selectedIdx > 0) setSelectedItem(allItems[selectedIdx - 1]);
            }}
            onNext={() => {
              if (selectedIdx < allItems.length - 1) setSelectedItem(allItems[selectedIdx + 1]);
            }}
          />
         );
      })()}

      {/* ─── Add Manual Item Dialog ──────────────────────────────────── */}
      {showAddItem && (
        <AddItemDialog
          projectId={projectId}
          defaultDivision={addItemDivision}
          currency={project?.currency || "USD"}
          onClose={() => setShowAddItem(false)}
          onSave={(data) => addItemMutation.mutate({ projectId, ...data })}
          isPending={addItemMutation.isPending}
        />
      )}

      {/* ─── Measurement Rollup Dialog ──────────────────────────────── */}
      <MeasurementRollup
        open={showRollup}
        onClose={() => setShowRollup(false)}
        markups={projectMarkups || []}
        projectName={project?.name || "Takeoff"}
      />
    </div>
  );
}
// ─── Add Item Dialog ──────────────────────────────────────────────────────────
const CSI_DIVISIONS_LIST = [
  { code: "01", name: "General Requirements" },
  { code: "02", name: "Existing Conditions" },
  { code: "03", name: "Concrete" },
  { code: "04", name: "Masonry" },
  { code: "05", name: "Metals" },
  { code: "06", name: "Wood, Plastics & Composites" },
  { code: "07", name: "Thermal & Moisture Protection" },
  { code: "08", name: "Openings" },
  { code: "09", name: "Finishes" },
  { code: "10", name: "Specialties" },
  { code: "11", name: "Equipment" },
  { code: "12", name: "Furnishings" },
  { code: "21", name: "Fire Suppression" },
  { code: "22", name: "Plumbing" },
  { code: "23", name: "HVAC" },
  { code: "26", name: "Electrical" },
  { code: "27", name: "Communications" },
  { code: "28", name: "Electronic Safety" },
  { code: "31", name: "Earthwork" },
  { code: "32", name: "Exterior Improvements" },
  { code: "33", name: "Utilities" },
];
const COMMON_UNITS = ["EA", "SF", "LF", "CY", "SY", "CF", "TON", "LB", "LS", "HR", "GAL", "BF", "MBF"];
function AddItemDialog({
  projectId,
  defaultDivision,
  currency,
  onClose,
  onSave,
  isPending,
}: {
  projectId: number;
  defaultDivision: string;
  currency: string;
  onClose: () => void;
  onSave: (data: {
    csiDivision: string;
    csiCode?: string;
    description: string;
    quantity: string;
    unit: string;
    unitCost: number;
    notes?: string;
  }) => void;
  isPending: boolean;
}) {
  const [csiDivision, setCsiDivision] = useState(defaultDivision);
  const [csiCode, setCsiCode] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("EA");
  const [unitCostDollars, setUnitCostDollars] = useState("");
  const [notes, setNotes] = useState("");

  const extCost = (parseFloat(quantity) || 0) * (parseFloat(unitCostDollars) || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !quantity || !unitCostDollars) return;
    onSave({
      csiDivision,
      csiCode: csiCode.trim() || undefined,
      description: description.trim(),
      quantity,
      unit,
      unitCost: Math.round(parseFloat(unitCostDollars) * 100),
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-emerald-400" />
            Add Manual Line Item
          </DialogTitle>
          <DialogDescription>Manually enter a takeoff item under any CSI division.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-cream-muted mb-1 block">CSI Division *</Label>
              <select
                value={csiDivision}
                onChange={(e) => setCsiDivision(e.target.value)}
                className="w-full h-9 rounded-md border border-white/10 bg-navy-medium text-cream text-sm px-3 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
              >
                {CSI_DIVISIONS_LIST.map((d) => (
                  <option key={d.code} value={d.code}>{d.code} — {d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs text-cream-muted mb-1 block">CSI Code (optional)</Label>
              <Input
                value={csiCode}
                onChange={(e) => setCsiCode(e.target.value)}
                placeholder="e.g. 03 30 00"
                className="h-9 text-sm bg-navy-medium border-white/10 text-cream"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-cream-muted mb-1 block">Description *</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. 4-inch Concrete Slab on Grade"
              className="h-9 text-sm bg-navy-medium border-white/10 text-cream"
              required
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-cream-muted mb-1 block">Quantity *</Label>
              <Input
                type="number"
                step="any"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                className="h-9 text-sm bg-navy-medium border-white/10 text-cream"
                required
              />
            </div>
            <div>
              <Label className="text-xs text-cream-muted mb-1 block">Unit</Label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full h-9 rounded-md border border-white/10 bg-navy-medium text-cream text-sm px-3 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
              >
                {COMMON_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs text-cream-muted mb-1 block">Unit Cost *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={unitCostDollars}
                onChange={(e) => setUnitCostDollars(e.target.value)}
                placeholder="0.00"
                className="h-9 text-sm bg-navy-medium border-white/10 text-cream"
                required
              />
            </div>
          </div>
          {(parseFloat(quantity) > 0 && parseFloat(unitCostDollars) > 0) && (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-2 flex items-center justify-between">
              <span className="text-cream-muted text-sm">Extended Cost</span>
              <span className="text-amber-400 font-semibold font-mono">
                {new Intl.NumberFormat("en-US", { style: "currency", currency }).format(extCost)}
              </span>
            </div>
          )}
          <div>
            <Label className="text-xs text-cream-muted mb-1 block">Notes (optional)</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes..."
              rows={2}
              className="w-full rounded-md border border-white/10 bg-navy-medium text-cream text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500/50 resize-none"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || !description.trim() || !quantity || !unitCostDollars}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
              Add Item
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
// ─── Edit Item Dialog ─────────────────────────────────────────────────────────

function EditItemDialog({
  item,
  projectId,
  onClose,
  onSave,
  isPending,
  currencyCode = "USD",
}: {
  item: any;
  projectId: number;
  onClose: () => void;
  onSave: (data: any) => void;
  isPending: boolean;
  currencyCode?: string;
}) {
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [unitCost, setUnitCost] = useState("");

  useEffect(() => {
    if (item) {
      setDescription(item.description || "");
      setQuantity(item.quantity?.toString() || "0");
      setUnit(item.unit || "EA");
      setUnitCost(((item.unitCost || 0) / 100).toFixed(2));
    }
  }, [item]);

  if (!item) return null;

  return (
    <Dialog open={!!item} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Takeoff Item</DialogTitle>
          <DialogDescription>Update the quantity, unit cost, or description.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Unit Cost ({currencyCode === "GBP" ? "£" : currencyCode === "AUD" ? "A$" : "$"})</Label>
              <Input
                type="number"
                step="0.01"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
              />
            </div>
          </div>
          <div className="bg-navy-deep/50 border border-white/10 rounded-lg p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-cream-muted">Extended Cost:</span>
              <span className="text-amber-400 font-bold text-lg">
                {formatCurrency(
                  Math.round(parseFloat(quantity || "0") * parseFloat(unitCost || "0") * 100),
                  currencyCode
                )}
              </span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              onSave({
                id: item.id,
                projectId,
                description,
                quantity,
                unit,
                unitCost: Math.round(parseFloat(unitCost || "0") * 100),
                reviewed: true,
              })
            }
            disabled={isPending}
            className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
          >
            {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
