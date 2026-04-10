import { Trash2, ChevronDown, ChevronRight, Palette, Pencil, Check, X, ArrowUpRight } from "lucide-react";
import { useState, useRef } from "react";
import type { ReactNode } from "react";

interface WBSNode {
  id: number;
  code: string;
  name: string;
  parentId?: number | null;
  groupColor?: string | null;
  groupTextColor?: string | null;
}

interface WBSTreeProps {
  nodes: WBSNode[];
  onDelete: (id: number) => void;
  onUpdateColor?: (id: number, groupColor: string, groupTextColor: string) => void;
  onUpdateNode?: (id: number, code: string, name: string, parentId?: number | null) => void;
}

const PRESET_COLORS = [
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
  { bg: "#1E293B", text: "#FFFFFF", label: "Dark" },
  { bg: "#F3F4F6", text: "#374151", label: "Light" },
];

export function WBSTree({ nodes, onDelete, onUpdateColor, onUpdateNode }: WBSTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(() => new Set(nodes.map(n => n.id)));
  const [colorPickerNodeId, setColorPickerNodeId] = useState<number | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<number | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editName, setEditName] = useState("");
  const [editParentId, setEditParentId] = useState<string>("__none__");
  const [customBg, setCustomBg] = useState("#3B82F6");
  const [customText, setCustomText] = useState("#FFFFFF");
  const colorPickerRef = useRef<HTMLDivElement>(null);

  const toggleExpanded = (id: number) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  // Get all descendant IDs of a node (to prevent circular parent assignment)
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

  const cancelEdit = () => {
    setEditingNodeId(null);
  };

  const openColorPicker = (node: WBSNode) => {
    setColorPickerNodeId(colorPickerNodeId === node.id ? null : node.id);
    setCustomBg(node.groupColor || "#3B82F6");
    setCustomText(node.groupTextColor || "#FFFFFF");
  };

  const applyColor = (nodeId: number, bg: string, text: string) => {
    if (onUpdateColor) {
      onUpdateColor(nodeId, bg, text);
    }
    setColorPickerNodeId(null);
  };

  const renderNode = (node: WBSNode, depth: number = 0): ReactNode => {
    const children = nodes.filter((w) => w.parentId === node.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedIds.has(node.id);
    const indent = depth * 24;
    const isEditing = editingNodeId === node.id;
    const showColorPicker = colorPickerNodeId === node.id;
    const nodeBg = node.groupColor || "#3B82F6";
    const nodeText = node.groupTextColor || "#FFFFFF";

    // Get valid parent options (exclude self and descendants)
    const descendantIds = getDescendantIds(node.id);
    const validParentOptions = nodes.filter(n => n.id !== node.id && !descendantIds.has(n.id));

    return (
      <div key={node.id}>
        <div
          className="flex items-center gap-1.5 py-1.5 px-2 hover:bg-white/8 rounded transition-colors group"
          style={{ marginLeft: `${indent}px` }}
        >
          {/* Expand/Collapse Toggle */}
          {hasChildren ? (
            <button
              onClick={() => toggleExpanded(node.id)}
              className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          ) : (
            <div className="w-5" />
          )}

          {/* Color swatch */}
          <button
            onClick={() => openColorPicker(node)}
            className="flex-shrink-0 w-5 h-5 rounded border border-white/15 cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all"
            style={{ backgroundColor: nodeBg }}
            title="Change group color"
          />

          {isEditing ? (
            /* Inline editing mode with parent selector */
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
                <button onClick={() => saveEdit(node)} className="text-green-600 hover:text-green-700 p-0.5" title="Save">
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600 p-0.5" title="Cancel">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {/* Parent selector */}
              <div className="flex items-center gap-1.5 ml-0.5">
                <ArrowUpRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                <span className="text-[10px] text-gray-500 flex-shrink-0">Parent:</span>
                <select
                  value={editParentId}
                  onChange={(e) => setEditParentId(e.target.value)}
                  className="text-xs px-1.5 py-0.5 border border-white/15 rounded bg-white/5 text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-400 flex-1 min-w-0"
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
            /* Display mode */
            <>
              {/* WBS Code Badge with group color */}
              <span
                className="text-xs font-mono font-bold px-2 py-1 rounded flex-shrink-0 min-w-fit"
                style={{ backgroundColor: nodeBg, color: nodeText }}
              >
                {node.code}
              </span>

              {/* WBS Name */}
              <span className="text-sm text-gray-200 truncate flex-1">{node.name}</span>

              {/* Child Count Badge */}
              {hasChildren && (
                <span className="text-[10px] text-gray-400 bg-white/8 px-2 py-1 rounded flex-shrink-0">
                  {children.length} child{children.length !== 1 ? "ren" : ""}
                </span>
              )}

              {/* Action buttons - visible on hover */}
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {onUpdateNode && (
                  <button
                    onClick={() => startEditing(node)}
                    className="text-gray-300 hover:text-blue-500 p-0.5 transition-colors"
                    title="Edit WBS node"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => openColorPicker(node)}
                  className="text-gray-300 hover:text-purple-500 p-0.5 transition-colors"
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
                  className="text-gray-300 hover:text-red-500 p-0.5 transition-colors"
                  title="Delete this WBS node"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Color Picker Popover */}
        {showColorPicker && (
          <div
            ref={colorPickerRef}
            className="ml-10 mr-2 mb-2 p-3 bg-[#1a1f2e] border border-white/15 rounded-lg shadow-lg"
            style={{ marginLeft: `${indent + 32}px` }}
          >
            <div className="text-xs font-medium text-gray-600 mb-2">Group Header Color</div>
            {/* Preset colors */}
            <div className="grid grid-cols-6 gap-1.5 mb-3">
              {PRESET_COLORS.map((preset) => (
                <button
                  key={preset.bg}
                  onClick={() => applyColor(node.id, preset.bg, preset.text)}
                  className={`w-7 h-7 rounded border-2 transition-all hover:scale-110 ${
                    nodeBg === preset.bg ? "border-amber-500 ring-2 ring-amber-500/30" : "border-white/10"
                  }`}
                  style={{ backgroundColor: preset.bg }}
                  title={preset.label}
                />
              ))}
            </div>
            {/* Custom color */}
            <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
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
              {/* Preview */}
              <div
                className="text-[10px] font-bold px-2 py-1 rounded"
                style={{ backgroundColor: customBg, color: customText }}
              >
                {node.code}
              </div>
            </div>
          </div>
        )}

        {/* Render Children */}
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
    <div className="max-h-80 overflow-y-auto border border-white/10 rounded-lg bg-white/5 p-3">
      {nodes.length === 0 ? (
        <div className="text-xs text-gray-400 text-center py-8">
          No WBS nodes defined yet. Create your first node below.
        </div>
      ) : (
        <div className="space-y-0">
          {topLevelNodes.map((root) => renderNode(root))}
        </div>
      )}
    </div>
  );
}
