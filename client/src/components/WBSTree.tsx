import { Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";

interface WBSNode {
  id: number;
  code: string;
  name: string;
  parentId?: number;
}

interface WBSTreeProps {
  nodes: WBSNode[];
  onDelete: (id: number) => void;
}

export function WBSTree({ nodes, onDelete }: WBSTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const toggleExpanded = (id: number) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const renderNode = (node: WBSNode, depth: number = 0): ReactNode => {
    const children = nodes.filter((w) => w.parentId === node.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedIds.has(node.id);
    const indent = depth * 24;

    return (
      <div key={node.id}>
        <div
          className="flex items-center gap-1 py-2 px-2 hover:bg-gray-100 rounded transition-colors group"
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

          {/* WBS Code Badge */}
          <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded flex-shrink-0 min-w-fit">
            {node.code}
          </span>

          {/* WBS Name */}
          <span className="text-sm text-gray-800 truncate flex-1">{node.name}</span>

          {/* Child Count Badge */}
          {hasChildren && (
            <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-1 rounded flex-shrink-0">
              {children.length} child{children.length !== 1 ? "ren" : ""}
            </span>
          )}

          {/* Delete Button */}
          <button
            onClick={() => {
              if (
                confirm(
                  `Delete WBS "${node.code}"${hasChildren ? " and all children?" : "?"}`
                )
              ) {
                onDelete(node.id);
              }
            }}
            className="text-gray-300 hover:text-red-500 flex-shrink-0 transition-colors opacity-0 group-hover:opacity-100"
            title="Delete this WBS node"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

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
    <div className="max-h-72 overflow-y-auto border border-gray-200 rounded-lg bg-gray-50 p-3">
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
