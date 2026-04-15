import { useState, useCallback } from "react";
import type { Shape } from "./types";

export function useMarkupHistory() {
  const [elements, setElements] = useState<Shape[]>([]);
  const [undoStack, setUndoStack] = useState<Shape[][]>([]);
  const [redoStack, setRedoStack] = useState<Shape[][]>([]);

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

  const clearAll = useCallback(() => {
    setUndoStack((prev) => [...prev, elements]);
    setElements([]);
    setRedoStack([]);
  }, [elements]);

  return {
    elements,
    pushElement,
    replaceElements,
    undo,
    redo,
    clearAll,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
  };
}
