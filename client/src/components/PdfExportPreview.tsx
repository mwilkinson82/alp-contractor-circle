import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Loader2 } from "lucide-react";

export interface PdfFooterConfig {
  columnCount: 3 | 4 | 5;
  columns: Array<{
    position: number;
    content: "company" | "project" | "date" | "page" | "empty";
    customText?: string;
  }>;
}

interface PdfExportPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (config: PdfFooterConfig) => Promise<void>;
  isExporting: boolean;
  projectName: string;
  companyName: string;
}

const FOOTER_CONTENT_OPTIONS = [
  { value: "company", label: "Company Name" },
  { value: "project", label: "Project Name" },
  { value: "date", label: "Export Date" },
  { value: "page", label: "Page Numbers" },
  { value: "empty", label: "Empty" },
];

export function PdfExportPreview({
  open,
  onOpenChange,
  onExport,
  isExporting,
  projectName,
  companyName,
}: PdfExportPreviewProps) {
  const [columnCount, setColumnCount] = useState<3 | 4 | 5>(3);
  const [columns, setColumns] = useState<PdfFooterConfig["columns"]>([
    { position: 0, content: "company" },
    { position: 1, content: "date" },
    { position: 2, content: "page" },
  ]);

  // Initialize columns when columnCount changes
  const handleColumnCountChange = (count: 3 | 4 | 5) => {
    setColumnCount(count);
    const newColumns: PdfFooterConfig["columns"] = [];
    for (let i = 0; i < count; i++) {
      if (i < columns.length) {
        newColumns.push(columns[i]);
      } else {
        newColumns.push({ position: i, content: "empty" });
      }
    }
    setColumns(newColumns);
  };

  const handleColumnContentChange = (position: number, content: any) => {
    const updated = [...columns];
    updated[position] = { ...updated[position], content };
    setColumns(updated);
  };

  const getContentPreview = (content: string): string => {
    switch (content) {
      case "company":
        return companyName || "Company Name";
      case "project":
        return projectName || "Project Name";
      case "date":
        return new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      case "page":
        return "Page 1 of 5";
      case "empty":
        return "";
      default:
        return "";
    }
  };

  const handleExport = async () => {
    await onExport({ columnCount, columns });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-gray-200 max-w-2xl text-gray-900">
        <DialogHeader>
          <DialogTitle className="font-semibold text-gray-900">PDF Export Preview</DialogTitle>
          <DialogDescription>Configure your footer layout and preview how it will appear on the PDF.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Column Count Selection */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">Footer Columns</Label>
            <div className="flex gap-2">
              {[3, 4, 5].map((count) => (
                <Button
                  key={count}
                  variant={columnCount === count ? "default" : "outline"}
                  onClick={() => handleColumnCountChange(count as 3 | 4 | 5)}
                  className="flex-1"
                >
                  {count} Columns
                </Button>
              ))}
            </div>
          </div>

          {/* Column Configuration */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700">Configure Each Column</Label>
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columnCount}, 1fr)` }}>
              {columns.map((col, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-3">
                  <Label className="text-xs text-gray-600 mb-2 block">Column {idx + 1}</Label>
                  <Select value={col.content} onValueChange={(v) => handleColumnContentChange(idx, v)}>
                    <SelectTrigger className="border-gray-300 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 text-foreground">
                      {FOOTER_CONTENT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-foreground">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Preview */}
          <div className="border border-gray-300 rounded-lg bg-gray-50 p-4">
            <p className="text-xs text-gray-600 mb-3 font-medium">FOOTER PREVIEW</p>
            <div
              className="bg-white border border-gray-200 p-3 rounded"
              style={{ display: "grid", gridTemplateColumns: `repeat(${columnCount}, 1fr)`, gap: "1rem" }}
            >
              {columns.map((col, idx) => (
                <div key={idx} className="text-center">
                  <p className="text-xs text-gray-700 font-medium">{getContentPreview(col.content)}</p>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-gray-500 mt-2 text-center">
              This is how your footer will appear on the exported PDF
            </p>
          </div>

          {/* Export Options */}
          <div className="space-y-3 border-t border-gray-200 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-600">Page Size</Label>
                <Select defaultValue="letter">
                  <SelectTrigger className="mt-1 border-gray-300 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 text-foreground">
                    <SelectItem value="letter" className="text-foreground">
                      Letter (8.5x11)
                    </SelectItem>
                    <SelectItem value="legal" className="text-foreground">
                      Legal (8.5x14)
                    </SelectItem>
                    <SelectItem value="tabloid" className="text-foreground">
                      Tabloid (11x17)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-gray-600">Orientation</Label>
                <Select defaultValue="landscape">
                  <SelectTrigger className="mt-1 border-gray-300 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 text-foreground">
                    <SelectItem value="landscape" className="text-foreground">
                      Landscape
                    </SelectItem>
                    <SelectItem value="portrait" className="text-foreground">
                      Portrait
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox defaultChecked />
                <span className="text-sm text-gray-900">Include Gantt Chart</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox />
                <span className="text-sm text-gray-900">Critical Path Only</span>
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-gray-300">
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
            Export PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
