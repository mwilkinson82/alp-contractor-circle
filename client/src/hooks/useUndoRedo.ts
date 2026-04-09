/**
 * Undo/Redo system for the CPM Scheduler.
 * 
 * Records actions with their inverse operations so they can be undone/redone.
 * Supports keyboard shortcuts (Ctrl+Z / Ctrl+Shift+Z or Ctrl+Y).
 */
import { useCallback, useEffect, useRef, useState } from "react";

export interface UndoableAction {
  /** Human-readable description of the action */
  description: string;
  /** The mutation call to execute (or re-execute on redo) */
  execute: () => Promise<void> | void;
  /** The inverse mutation call to undo the action */
  undo: () => Promise<void> | void;
}

interface UndoRedoState {
  past: UndoableAction[];
  future: UndoableAction[];
  isProcessing: boolean;
}

const MAX_HISTORY = 50;

export function useUndoRedo() {
  const stateRef = useRef<UndoRedoState>({
    past: [],
    future: [],
    isProcessing: false,
  });
  // Force re-render trigger
  const [, setTick] = useState(0);
  const tick = useCallback(() => setTick((t) => t + 1), []);

  /**
   * Record an action that was just performed.
   * Call this AFTER the action succeeds.
   */
  const record = useCallback((action: UndoableAction) => {
    const s = stateRef.current;
    s.past = [...s.past.slice(-(MAX_HISTORY - 1)), action];
    s.future = []; // Clear redo stack on new action
    tick();
  }, [tick]);

  /**
   * Undo the last action.
   */
  const undo = useCallback(async () => {
    const s = stateRef.current;
    if (s.past.length === 0 || s.isProcessing) return;
    s.isProcessing = true;
    tick();
    const action = s.past[s.past.length - 1];
    try {
      await action.undo();
      s.past = s.past.slice(0, -1);
      s.future = [action, ...s.future];
    } catch (err) {
      console.error("[UndoRedo] Undo failed:", err);
    } finally {
      s.isProcessing = false;
      tick();
    }
  }, [tick]);

  /**
   * Redo the last undone action.
   */
  const redo = useCallback(async () => {
    const s = stateRef.current;
    if (s.future.length === 0 || s.isProcessing) return;
    s.isProcessing = true;
    tick();
    const action = s.future[0];
    try {
      await action.execute();
      s.future = s.future.slice(1);
      s.past = [...s.past, action];
    } catch (err) {
      console.error("[UndoRedo] Redo failed:", err);
    } finally {
      s.isProcessing = false;
      tick();
    }
  }, [tick]);

  /**
   * Clear all history (e.g., when switching schedules).
   */
  const clear = useCallback(() => {
    stateRef.current = { past: [], future: [], isProcessing: false };
    tick();
  }, [tick]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (!mod) return;

      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.key === "z" && e.shiftKey) || e.key === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

  return {
    record,
    undo,
    redo,
    clear,
    canUndo: stateRef.current.past.length > 0,
    canRedo: stateRef.current.future.length > 0,
    isProcessing: stateRef.current.isProcessing,
    undoDescription: stateRef.current.past.length > 0
      ? stateRef.current.past[stateRef.current.past.length - 1].description
      : null,
    redoDescription: stateRef.current.future.length > 0
      ? stateRef.current.future[0].description
      : null,
    historyCount: stateRef.current.past.length,
  };
}
