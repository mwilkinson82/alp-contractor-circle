import { useState, useCallback, useRef } from "react";
import type { Shape } from "./types";

export function useMarkupHistory() {
  const [elements, setElements] = useState<Shape[]>([]);
  const [undoStack, setUndoStack] = useState<Shape[][]>([]);
  const [redoStack, setRedoStack] = useState<Shape[][]>([]);

  // For drag coalescing: snapshot taken at drag start, committed at drag end
  const dragSnapshotRef = useRef<Shape[] | null>(null);

  const pushElement = useCallback(
    (shape: Shape) => {
      setUndoStack((prev) => [...prev, elements]);
      setElements((prev) => [...prev, shape]);
      setRedoStack([]);
    },
    [elements],
  );

  const replaceElements = useCallback(
    (newElements: Shape[]) => {
      setUndoStack((prev) => [...prev, elements]);
      setElements(newElements);
      setRedoStack([]);
    },
    [elements],
  );

  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((s) => s.slice(0, -1));
    setRedoStack((s) => [...s, elements]);
    setElements(prev);
  }, [undoStack, elements]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((s) => s.slice(0, -1));
    setUndoStack((s) => [...s, elements]);
    setElements(next);
  }, [redoStack, elements]);

  /** Update a shape and push current state to undo stack (for discrete edits like color/width change) */
  const updateElement = useCallback(
    (id: string, updater: (shape: Shape) => Shape) => {
      setUndoStack((prev) => [...prev, elements]);
      setElements((prev) => prev.map((s) => (s.id === id ? updater(s) : s)));
      setRedoStack([]);
    },
    [elements],
  );

  /**
   * Update a shape WITHOUT pushing to undo stack.
   * Used during drag operations — call beginDrag() first, then updateElementSilent()
   * on each pointer move, then commitDrag() when done.
   */
  const updateElementSilent = useCallback(
    (id: string, updater: (shape: Shape) => Shape) => {
      setElements((prev) => prev.map((s) => (s.id === id ? updater(s) : s)));
    },
    [],
  );

  /** Call at the start of a drag to snapshot current state for undo */
  const beginDrag = useCallback(() => {
    dragSnapshotRef.current = elements;
  }, [elements]);

  /** Call at the end of a drag to commit the snapshot to undo stack */
  const commitDrag = useCallback(() => {
    if (dragSnapshotRef.current) {
      setUndoStack((prev) => [...prev, dragSnapshotRef.current!]);
      setRedoStack([]);
      dragSnapshotRef.current = null;
    }
  }, []);

  const removeElement = useCallback(
    (id: string) => {
      setUndoStack((prev) => [...prev, elements]);
      setElements((prev) => prev.filter((s) => s.id !== id));
      setRedoStack([]);
    },
    [elements],
  );

  const clearAll = useCallback(() => {
    setUndoStack((prev) => [...prev, elements]);
    setElements([]);
    setRedoStack([]);
  }, [elements]);

  return {
    elements,
    pushElement,
    replaceElements,
    updateElement,
    updateElementSilent,
    beginDrag,
    commitDrag,
    removeElement,
    undo,
    redo,
    clearAll,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
  };
}
