import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Trash2, Plus, Edit2 } from "lucide-react";

interface ActivityCodeManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduleId: number;
  codeCategories: any[];
}

export function ActivityCodeManager({ open, onOpenChange, scheduleId, codeCategories }: ActivityCodeManagerProps) {
  const utils = trpc.useUtils();
  
  // Category management state
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingValueId, setEditingValueId] = useState<number | null>(null);
  const [editingValueCategoryId, setEditingValueCategoryId] = useState<number | null>(null);
  const [newValueText, setNewValueText] = useState("");
  const [newValueColor, setNewValueColor] = useState("#3b82f6");
  const [expandedCategoryId, setExpandedCategoryId] = useState<number | null>(null);

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
      setNewCategoryName("");
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
      setNewValueText("");
      setNewValueColor("#3b82f6");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateValueMut = trpc.schedule.updateCodeValue.useMutation({
    onSuccess: () => {
      utils.schedule.get.invalidate();
      toast.success("Value updated");
      setEditingValueId(null);
      setEditingValueCategoryId(null);
      setNewValueText("");
      setNewValueColor("#3b82f6");
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
    if (!newCategoryName.trim()) {
      toast.error("Category name required");
      return;
    }
    updateCategoryMut.mutate({
      id,
      scheduleId,
      name: newCategoryName.trim(),
    });
  };

  const handleAddValue = (categoryId: number) => {
    if (!newValueText.trim()) {
      toast.error("Value required");
      return;
    }
    addValueMut.mutate({
      categoryId,
      scheduleId,
      value: newValueText.trim(),
      color: newValueColor,
    });
  };

  const handleUpdateValue = (valueId: number) => {
    if (!newValueText.trim()) {
      toast.error("Value required");
      return;
    }
    updateValueMut.mutate({
      id: valueId,
      scheduleId,
      value: newValueText.trim(),
      color: newValueColor,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
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
                className="bg-amber-500 text-gray-950 hover:bg-amber-400 font-semibold"
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
              {codeCategories.map((category: any) => (
                <div key={category.id} className="border border-white/10 rounded-lg p-4 bg-white/5">
                  {/* Category Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      {editingCategoryId === category.id ? (
                        <div className="flex gap-2">
                          <Input
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder="Category name"
                            className="flex-1 border-white/15 bg-white/5 text-gray-200 text-sm"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleUpdateCategory(category.id)}
                            disabled={updateCategoryMut.isPending}
                            className="bg-amber-500 text-gray-950 hover:bg-amber-400 font-semibold"
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingCategoryId(null);
                              setNewCategoryName("");
                            }}
                            className="border-white/15"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-gray-300">{category.name}</h4>
                          <span className="text-xs text-gray-500">({category.values?.length || 0} values)</span>
                        </div>
                      )}
                    </div>
                    {editingCategoryId !== category.id && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingCategoryId(category.id);
                            setNewCategoryName(category.name);
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

                  {/* Values List */}
                  {editingCategoryId !== category.id && (
                    <div className="space-y-2 mb-3">
                      {category.values && category.values.length > 0 ? (
                        category.values.map((value: any) => (
                          <div key={value.id} className="flex items-center justify-between gap-2 p-2 bg-white/3 rounded border border-white/5">
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
                                  setEditingValueCategoryId(category.id);
                                  setNewValueText(value.value);
                                  setNewValueColor(value.color || "#3b82f6");
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
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-gray-600 italic">No values yet</p>
                      )}
                    </div>
                  )}

                  {/* Add/Edit Value */}
                  {editingValueCategoryId === category.id && editingValueId ? (
                    <div className="border-t border-white/10 pt-3 space-y-2">
                      <p className="text-xs text-gray-500 font-medium">Edit Value</p>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={newValueColor}
                          onChange={(e) => setNewValueColor(e.target.value)}
                          className="w-10 h-8 rounded border border-white/15 cursor-pointer"
                        />
                        <Input
                          value={newValueText}
                          onChange={(e) => setNewValueText(e.target.value)}
                          placeholder="Value name"
                          className="flex-1 border-white/15 bg-white/5 text-gray-200 text-sm"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleUpdateValue(editingValueId)}
                          disabled={updateValueMut.isPending}
                          className="bg-amber-500 text-gray-950 hover:bg-amber-400 font-semibold"
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingValueId(null);
                            setEditingValueCategoryId(null);
                            setNewValueText("");
                            setNewValueColor("#3b82f6");
                          }}
                          className="border-white/15"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    editingCategoryId !== category.id && (
                      <div className="border-t border-white/10 pt-3 space-y-2">
                        <p className="text-xs text-gray-500 font-medium">Add Value</p>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={newValueColor}
                            onChange={(e) => setNewValueColor(e.target.value)}
                            className="w-10 h-8 rounded border border-white/15 cursor-pointer"
                          />
                          <Input
                            value={newValueText}
                            onChange={(e) => setNewValueText(e.target.value)}
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
                            className="bg-amber-500 text-gray-950 hover:bg-amber-400 font-semibold"
                          >
                            <Plus className="w-3 h-3 mr-1" /> Add
                          </Button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              ))}
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
