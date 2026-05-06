import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Trash2, Plus, Edit2, ChevronDown, ChevronRight } from "lucide-react";

interface ActivityCodeManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduleId: number;
  codeCategories: any[];
}

export function ActivityCodeManager({ open, onOpenChange, scheduleId, codeCategories }: ActivityCodeManagerProps) {
  const utils = trpc.useUtils();
  
  // Category management state
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");

  // Per-category value input state — only active for the expanded category
  const [expandedCategoryId, setExpandedCategoryId] = useState<number | null>(null);
  const [addValueText, setAddValueText] = useState("");
  const [addValueColor, setAddValueColor] = useState("#3b82f6");

  // Editing an existing value (separate state from adding)
  const [editingValueId, setEditingValueId] = useState<number | null>(null);
  const [editValueText, setEditValueText] = useState("");
  const [editValueColor, setEditValueColor] = useState("#3b82f6");

  // Mutations
  const createCategoryMut = trpc.schedule.addCodeCategory.useMutation({
    onSuccess: () => {
      utils.schedule.get.invalidate();
      toast.success("Category created");
      setNewCategoryName("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateCategoryMut = trpc.schedule.updateCodeCategory.useMutation({
    onSuccess: () => {
      utils.schedule.get.invalidate();
      toast.success("Category updated");
      setEditingCategoryId(null);
      setEditCategoryName("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteCategoryMut = trpc.schedule.deleteCodeCategory.useMutation({
    onSuccess: () => {
      utils.schedule.get.invalidate();
      toast.success("Category deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addValueMut = trpc.schedule.addCodeValue.useMutation({
    onSuccess: () => {
      utils.schedule.get.invalidate();
      toast.success("Value added");
      setAddValueText("");
      setAddValueColor("#3b82f6");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateValueMut = trpc.schedule.updateCodeValue.useMutation({
    onSuccess: () => {
      utils.schedule.get.invalidate();
      toast.success("Value updated");
      setEditingValueId(null);
      setEditValueText("");
      setEditValueColor("#3b82f6");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteValueMut = trpc.schedule.deleteCodeValue.useMutation({
    onSuccess: () => {
      utils.schedule.get.invalidate();
      toast.success("Value deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      toast.error("Category name required");
      return;
    }
    createCategoryMut.mutate({
      scheduleId,
      name: newCategoryName.trim(),
    });
  };

  const handleUpdateCategory = (id: number) => {
    if (!editCategoryName.trim()) {
      toast.error("Category name required");
      return;
    }
    updateCategoryMut.mutate({
      id,
      scheduleId,
      name: editCategoryName.trim(),
    });
  };

  const handleAddValue = (categoryId: number) => {
    if (!addValueText.trim()) {
      toast.error("Value required");
      return;
    }
    addValueMut.mutate({
      categoryId,
      scheduleId,
      value: addValueText.trim(),
      color: addValueColor,
    });
  };

  const handleUpdateValue = (valueId: number) => {
    if (!editValueText.trim()) {
      toast.error("Value required");
      return;
    }
    updateValueMut.mutate({
      id: valueId,
      scheduleId,
      value: editValueText.trim(),
      color: editValueColor,
    });
  };

  const toggleCategory = (categoryId: number) => {
    if (expandedCategoryId === categoryId) {
      setExpandedCategoryId(null);
    } else {
      setExpandedCategoryId(categoryId);
      // Reset add-value form when switching categories
      setAddValueText("");
      setAddValueColor("#3b82f6");
      // Cancel any value edit in progress
      setEditingValueId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col bg-[#07111f] text-[#f8fbff] border-[#2f80ff]/20">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Activity Code Manager</DialogTitle>
          <DialogDescription>Create and manage custom activity code categories and values for filtering and grouping.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Add New Category Section */}
          <div className="border border-white/10 rounded-lg p-4 bg-white/5">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Add New Category</h3>
            <div className="flex gap-2">
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g., Phase, Status, Discipline"
                className="flex-1 border-white/15 bg-white/5 text-gray-200"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddCategory();
                }}
              />
              <Button
                onClick={handleAddCategory}
                disabled={createCategoryMut.isPending}
                className="bg-blue-500 text-white hover:bg-blue-400 font-semibold"
              >
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </div>
          </div>

          {/* Categories List */}
          {codeCategories.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No categories yet. Create one to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {codeCategories.map((category: any) => {
                const isExpanded = expandedCategoryId === category.id;
                const isEditingThisCategory = editingCategoryId === category.id;

                return (
                  <div key={category.id} className="border border-white/10 rounded-lg bg-white/5">
                    {/* Category Header — clickable to expand/collapse */}
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/3 rounded-t-lg"
                      onClick={() => {
                        if (!isEditingThisCategory) toggleCategory(category.id);
                      }}
                    >
                      <div className="flex-1">
                        {isEditingThisCategory ? (
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <Input
                              value={editCategoryName}
                              onChange={(e) => setEditCategoryName(e.target.value)}
                              placeholder="Category name"
                              className="flex-1 border-white/15 bg-white/5 text-gray-200 text-sm"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleUpdateCategory(category.id);
                                if (e.key === "Escape") { setEditingCategoryId(null); setEditCategoryName(""); }
                              }}
                              autoFocus
                            />
                            <Button
                              size="sm"
                              onClick={() => handleUpdateCategory(category.id)}
                              disabled={updateCategoryMut.isPending}
                              className="bg-blue-500 text-white hover:bg-blue-400 font-semibold"
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingCategoryId(null);
                                setEditCategoryName("");
                              }}
                              className="border-white/15"
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-gray-500" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-500" />
                            )}
                            <h4 className="text-sm font-semibold text-gray-300">{category.name}</h4>
                            <span className="text-xs text-gray-500">({category.values?.length || 0} values)</span>
                          </div>
                        )}
                      </div>
                      {!isEditingThisCategory && (
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingCategoryId(category.id);
                              setEditCategoryName(category.name);
                            }}
                            className="h-7 text-xs text-gray-400 hover:text-gray-200"
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (confirm(`Delete category "${category.name}" and all its values?`)) {
                                deleteCategoryMut.mutate({ id: category.id, scheduleId });
                              }
                            }}
                            disabled={deleteCategoryMut.isPending}
                            className="h-7 text-xs text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Expanded: Values List + Add Value Form */}
                    {isExpanded && !isEditingThisCategory && (
                      <div className="px-4 pb-4 space-y-2">
                        {/* Existing values */}
                        {category.values && category.values.length > 0 ? (
                          <div className="space-y-1">
                            {category.values.map((value: any) => (
                              <div key={value.id} className="flex items-center justify-between gap-2 p-2 bg-white/3 rounded border border-white/5">
                                {editingValueId === value.id ? (
                                  /* Inline edit for this value */
                                  <div className="flex items-center gap-2 flex-1">
                                    <input
                                      type="color"
                                      value={editValueColor}
                                      onChange={(e) => setEditValueColor(e.target.value)}
                                      className="w-8 h-7 rounded border border-white/15 cursor-pointer"
                                    />
                                    <Input
                                      value={editValueText}
                                      onChange={(e) => setEditValueText(e.target.value)}
                                      placeholder="Value name"
                                      className="flex-1 border-white/15 bg-white/5 text-gray-200 text-sm h-7"
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") handleUpdateValue(value.id);
                                        if (e.key === "Escape") { setEditingValueId(null); }
                                      }}
                                      autoFocus
                                    />
                                    <Button
                                      size="sm"
                                      onClick={() => handleUpdateValue(value.id)}
                                      disabled={updateValueMut.isPending}
                                      className="h-7 bg-blue-500 text-white hover:bg-blue-400 font-semibold text-xs"
                                    >
                                      Save
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => { setEditingValueId(null); }}
                                      className="h-7 border-white/15 text-xs"
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                ) : (
                                  /* Display mode */
                                  <>
                                    <div className="flex items-center gap-2 flex-1">
                                      <div
                                        className="w-4 h-4 rounded border border-white/20"
                                        style={{ backgroundColor: value.color || "#3b82f6" }}
                                      />
                                      <span className="text-xs text-gray-400">{value.value}</span>
                                    </div>
                                    <div className="flex gap-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          setEditingValueId(value.id);
                                          setEditValueText(value.value);
                                          setEditValueColor(value.color || "#3b82f6");
                                        }}
                                        className="h-6 w-6 p-0 text-gray-400 hover:text-gray-200"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          if (confirm(`Delete value "${value.value}"?`)) {
                                            deleteValueMut.mutate({ id: value.id, scheduleId });
                                          }
                                        }}
                                        disabled={deleteValueMut.isPending}
                                        className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-600 italic py-1">No values yet — add one below</p>
                        )}

                        {/* Add Value form — only shown for THIS expanded category, not when editing a value */}
                        {editingValueId === null && (
                          <div className="border-t border-white/10 pt-3 mt-2">
                            <p className="text-xs text-gray-500 font-medium mb-2">Add Value to "{category.name}"</p>
                            <div className="flex gap-2">
                              <input
                                type="color"
                                value={addValueColor}
                                onChange={(e) => setAddValueColor(e.target.value)}
                                className="w-10 h-8 rounded border border-white/15 cursor-pointer"
                              />
                              <Input
                                value={addValueText}
                                onChange={(e) => setAddValueText(e.target.value)}
                                placeholder="e.g., Design, Procurement, Installation"
                                className="flex-1 border-white/15 bg-white/5 text-gray-200 text-sm"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleAddValue(category.id);
                                }}
                              />
                              <Button
                                size="sm"
                                onClick={() => handleAddValue(category.id)}
                                disabled={addValueMut.isPending}
                                className="bg-blue-500 text-white hover:bg-blue-400 font-semibold"
                              >
                                <Plus className="w-3 h-3 mr-1" /> Add
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-white/15">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
