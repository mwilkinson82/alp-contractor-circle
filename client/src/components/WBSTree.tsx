import { Trash2, ChevronDown, ChevronRight, Palette, Pencil, Check, X, ArrowUpRight, GripVertical } from "lucide-react";
import { useState, useRef, useCallback } from "react";
import type { ReactNode, DragEvent } from "react";

interface WBSNode {
  id: number;
  code: string;
  name: string;
  parentId?: number | null;
  sortOrder?: number | null;
  groupColor?: string | null;
  groupTextColor?: string | null;
}

interface WBSTreeProps {
  nodes: WBSNode[];
  onDelete: (id: number) => void;
  onUpdateColor?: (id: number, groupColor: string, groupTextColor: string) => void;
  onUpdateNode?: (id: number, code: string, name: string, parentId?: number | null) => void;
  onReorder?: (draggedId: number, targetId: number, position: "before" | "after" | "inside") => void;
}

const PRESET_COLORS = [
  { bg: "#1E3A5F", text: "#DBEAFE", label: "Navy Blue" },
  { bg: "#1E293B", text: "#F1F5F9", label: "Slate Dark" },
  { bg: "#78350F", text: "#FEF3C7", label: "Amber Dark" },
  { bg: "#4C1D95", text: "#EDE9FE", label: "Purple Dark" },
  { bg: "#064E3B", text: "#D1FAE5", label: "Emerald Dark" },
  { bg: "#7F1D1D", text: "#FEE2E2", label: "Red Dark" },
  { bg: "#374151", text: "#F9FAFB", label: "Gray Dark" },
  { bg: "#14532D", text: "#BBF7D0", label: "Green Dark" },
  { bg: "#3B82F6", text: "#FFFFFF", label: "Blue" },
  { bg: "#10B981", text: "#FFFFFF", label: "Green" },
  { bg: "#F59E0B", text: "#1F2937", label: "Amber" },
  { bg: "#EF4444", text: "#FFFFFF", label: "Red" },
  { bg: "#8B5CF6", text: "#FFFFFF", label: "Purple" },
  { bg: "#EC4899", text: "#FFFFFF", label: "Pink" },
  { bg: "#06B6D4", text: "#FFFFFF", label: "Cyan" },
  { bg: "#F97316", text: "#FFFFFF", label: "Orange" },
  { bg: "#6366F1", text: "#FFFFFF", label: "Indigo" },
  { bg: "#14B8A6", text: "#FFFFFF", label: "Teal" },
];

export function WBSTree({ nodes, onDelete, onUpdateColor, onUpdateNode, onReorder }: WBSTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(() => new Set(nodes.map(n => n.id)));
  const [colorPickerNodeId, setColorPickerNodeId] = useState<number | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<number | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editName, setEditName] = useState("");
  const [editParentId, setEditParentId] = useState<string>("__none__");
  const [customBg, setCustomBg] = useState("#3B82F6");
  const [customText, setCustomText] = useState("#FFFFFF");
  const colorPickerRef = useRef<HTMLDivElement>(null);

  // Drag state
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dropTargetId, setDropTargetId] = useState<number | null>(null);
  const [dropPosition, setDropPosition] = useState<"before" | "after" | "inside" | null>(null);

  const toggleExpanded = (id: number) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const getDescendantIds = (nodeId: number): Set<number> => {
    const descendants = new Set<number>();
    const queue = [nodeId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      const children = nodes.filter(n => n.parentId === current);
      for (const child of children) {
        descendants.add(child.id);
        queue.push(child.id);
      }
    }
    return descendants;
  };

  const startEditing = (node: WBSNode) => {
    setEditingNodeId(node.id);
    setEditCode(node.code);
    setEditName(node.name);
    setEditParentId(node.parentId ? String(node.parentId) : "__none__");
  };

  const saveEdit = (node: WBSNode) => {
    if (onUpdateNode && editCode.trim() && editName.trim()) {
      const newParentId = editParentId === "__none__" ? null : parseInt(editParentId);
      onUpdateNode(node.id, editCode.trim(), editName.trim(), newParentId);
    }
    setEditingNodeId(null);
  };

  const cancelEdit = () => setEditingNodeId(null);

  const openColorPicker = (node: WBSNode) => {
    setColorPickerNodeId(colorPickerNodeId === node.id ? null : node.id);
    setCustomBg(node.groupColor || "#3B82F6");
    setCustomText(node.groupTextColor || "#FFFFFF");
  };

  const applyColor = (nodeId: number, bg: string, text: string) => {
    if (onUpdateColor) onUpdateColor(nodeId, bg, text);
    setColorPickerNodeId(null);
  };

  // Drag handlers
  const handleDragStart = useCallback((e: DragEvent, nodeId: number) => {
    setDraggedId(nodeId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(nodeId));
  }, []);

  const handleDragOver = useCallback((e: DragEvent, nodeId: number) => {
    e.preventDefault();
    if (draggedId === nodeId) return;
    // Determine drop position based on mouse Y within the element
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const h = rect.height;
    let pos: "before" | "after" | "inside";
    if (y < h * 0.25) pos = "before";
    else if (y > h * 0.75) pos = "after";
    else pos = "inside";
    setDropTargetId(nodeId);
    setDropPosition(pos);
    e.dataTransfer.dropEffect = "move";
  }, [draggedId]);

  const handleDrop = useCallback((e: DragEvent, targetId: number) => {
    e.preventDefault();
    if (draggedId !== null && draggedId !== targetId && dropPosition && onReorder) {
      onReorder(draggedId, targetId, dropPosition);
    }
    setDraggedId(null);
    setDropTargetId(null);
    setDropPosition(null);
  }, [draggedId, dropPosition, onReorder]);

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
    setDropTargetId(null);
    setDropPosition(null);
  }, []);

  const renderNode = (node: WBSNode, depth: number = 0): ReactNode => {
    const children = nodes.filter((w) => w.parentId === node.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedIds.has(node.id);
    const indent = depth * 20;
    const isEditing = editingNodeId === node.id;
    const showColorPicker = colorPickerNodeId === node.id;
    const nodeBg = node.groupColor || "#3B82F6";
    const nodeText = node.groupTextColor || "#FFFFFF";
    const isDragging = draggedId === node.id;
    const isDropTarget = dropTargetId === node.id;

    const descendantIds = getDescendantIds(node.id);
    const validParentOptions = nodes.filter(n => n.id !== node.id && !descendantIds.has(n.id));

    // Drop indicator styling
    let dropIndicatorClass = "";
    if (isDropTarget && !isDragging) {
      if (dropPosition === "before") dropIndicatorClass = "border-t-2 border-t-amber-400";
      else if (dropPosition === "after") dropIndicatorClass = "border-b-2 border-b-amber-400";
      else if (dropPosition === "inside") dropIndicatorClass = "ring-2 ring-amber-400/60 rounded";
    }

    return (
      <div key={node.id} className={isDragging ? "opacity-40" : ""}>
        <div
          className={`flex items-center gap-1.5 py-2 px-2 hover:bg-white/5 rounded transition-colors group cursor-default ${dropIndicatorClass}`}
          style={{ marginLeft: `${indent}px` }}
          draggable={!!onReorder}
          onDragStart={(e) => handleDragStart(e, node.id)}
          onDragOver={(e) => handleDragOver(e, node.id)}
          onDrop={(e) => handleDrop(e, node.id)}
          onDragEnd={handleDragEnd}
        >
          {/* Drag handle */}
          {onReorder && (
            <div
              className="flex-shrink-0 cursor-grab active:cursor-grabbing text-gray-600 hover:text-gray-400 transition-colors opacity-0 group-hover:opacity-100"
              title="Drag to reorder"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </div>
          )}

          {/* Expand/Collapse Toggle */}
          {hasChildren ? (
            <button
              onClick={() => toggleExpanded(node.id)}
              className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-200 transition-colors"
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : (
            <div className="w-5" />
          )}

          {/* Color swatch */}
          <button
            onClick={() => openColorPicker(node)}
            className="flex-shrink-0 w-5 h-5 rounded border border-white/20 cursor-pointer hover:ring-2 hover:ring-amber-400/60 transition-all"
            style={{ backgroundColor: nodeBg }}
            title="Change group color"
          />

          {isEditing ? (
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  className="w-16 text-xs font-mono px-1.5 py-0.5 border border-white/15 rounded bg-white/5 text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter") saveEdit(node); if (e.key === "Escape") cancelEdit(); }}
                />
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 text-sm px-1.5 py-0.5 border border-white/15 rounded bg-white/5 text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-400 min-w-0"
                  onKeyDown={(e) => { if (e.key === "Enter") saveEdit(node); if (e.key === "Escape") cancelEdit(); }}
                />
                <button onClick={() => saveEdit(node)} className="text-emerald-400 hover:text-emerald-300 p-0.5" title="Save">
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-200 p-0.5" title="Cancel">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-1.5 ml-0.5">
                <ArrowUpRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                <span className="text-[10px] text-gray-500 flex-shrink-0">Parent:</span>
                <select
                  value={editParentId}
                  onChange={(e) => setEditParentId(e.target.value)}
                  className="text-xs px-1.5 py-0.5 border border-white/15 rounded bg-[#0f1219] text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-400 flex-1 min-w-0"
                >
                  <option value="__none__">None (top level)</option>
                  {validParentOptions.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.code} — {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <>
              {/* WBS Code Badge */}
              <span
                className="text-xs font-mono font-bold px-2 py-0.5 rounded flex-shrink-0 min-w-fit"
                style={{ backgroundColor: nodeBg, color: nodeText }}
              >
                {node.code}
              </span>

              {/* WBS Name */}
              <span className="text-sm text-gray-200 truncate flex-1 font-medium">{node.name}</span>

              {/* Depth indicator */}
              <span className="text-[10px] text-gray-600 flex-shrink-0">
                {depth === 0 ? "Root" : depth === 1 ? "L1" : depth === 2 ? "L2" : `L${depth}`}
              </span>

              {/* Child Count */}
              {hasChildren && (
                <span className="text-[10px] text-gray-500 bg-white/8 px-1.5 py-0.5 rounded flex-shrink-0">
                  {children.length}
                </span>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {onUpdateNode && (
                  <button
                    onClick={() => startEditing(node)}
                    className="text-gray-400 hover:text-blue-400 p-0.5 transition-colors"
                    title="Edit WBS node"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => openColorPicker(node)}
                  className="text-gray-400 hover:text-purple-400 p-0.5 transition-colors"
                  title="Change group color"
                >
                  <Palette className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete WBS "${node.code}"${hasChildren ? " and all children?" : "?"}`)) {
                      onDelete(node.id);
                    }
                  }}
                  className="text-gray-400 hover:text-red-400 p-0.5 transition-colors"
                  title="Delete this WBS node"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Color Picker */}
        {showColorPicker && (
          <div
            ref={colorPickerRef}
            className="mr-2 mb-2 p-3 bg-[#1a1f2e] border border-white/15 rounded-lg shadow-xl"
            style={{ marginLeft: `${indent + 36}px` }}
          >
            <div className="text-xs font-semibold text-gray-300 mb-2">Group Header Color</div>
            <div className="grid grid-cols-6 gap-1.5 mb-3">
              {PRESET_COLORS.map((preset) => (
                <button
                  key={preset.bg}
                  onClick={() => applyColor(node.id, preset.bg, preset.text)}
                  className={`w-7 h-7 rounded border-2 transition-all hover:scale-110 ${
                    nodeBg === preset.bg ? "border-amber-400 ring-2 ring-amber-400/30" : "border-white/10"
                  }`}
                  style={{ backgroundColor: preset.bg }}
                  title={preset.label}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-white/10">
              <div className="flex items-center gap-1.5">
                <label className="text-[10px] text-gray-500">BG</label>
                <input
                  type="color"
                  value={customBg}
                  onChange={(e) => setCustomBg(e.target.value)}
                  className="w-6 h-6 rounded border border-white/15 cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <label className="text-[10px] text-gray-500">Text</label>
                <input
                  type="color"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  className="w-6 h-6 rounded border border-white/15 cursor-pointer"
                />
              </div>
              <button
                onClick={() => applyColor(node.id, customBg, customText)}
                className="ml-auto text-xs bg-amber-500 text-gray-950 font-semibold px-2.5 py-1 rounded hover:bg-amber-400 transition-colors"
              >
                Apply
              </button>
              <div
                className="text-[10px] font-bold px-2 py-1 rounded"
                style={{ backgroundColor: customBg, color: customText }}
              >
                {node.code}
              </div>
            </div>
          </div>
        )}

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const topLevelNodes = nodes.filter((w) => !w.parentId);

  return (
    <div className="overflow-y-auto border border-white/10 rounded-lg bg-[#0d1117]" style={{ maxHeight: "calc(60vh - 2rem)", minHeight: "200px" }}>
      {nodes.length === 0 ? (
        <div className="text-xs text-gray-500 text-center py-10">
          No WBS nodes defined yet. Create your first node below.
        </div>
      ) : (
        <div className="p-2">
          {/* Legend */}
          <div className="flex items-center gap-3 px-2 pb-2 mb-1 border-b border-white/8 text-[10px] text-gray-600">
            {onReorder && <span className="flex items-center gap-1"><GripVertical className="w-3 h-3" /> Drag to reorder</span>}
            <span className="flex items-center gap-1"><ChevronRight className="w-3 h-3" /> Click to expand</span>
            <span className="ml-auto">{nodes.length} node{nodes.length !== 1 ? "s" : ""} total</span>
          </div>
          <div className="space-y-0">
            {topLevelNodes.map((root) => renderNode(root))}
          </div>
        </div>
      )}
    </div>
  );
}
