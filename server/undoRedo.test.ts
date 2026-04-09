import { describe, it, expect } from "vitest";

/**
 * Tests for the undo/redo system logic.
 * Since the hook is React-based, we test the core logic patterns here.
 */

describe("Undo/Redo Logic", () => {
  // Simulate the undo/redo stack logic without React
  class UndoRedoStack {
    past: { description: string; execute: () => void; undo: () => void }[] = [];
    future: { description: string; execute: () => void; undo: () => void }[] = [];

    record(action: { description: string; execute: () => void; undo: () => void }) {
      this.past.push(action);
      this.future = []; // Clear redo on new action
    }

    undo() {
      if (this.past.length === 0) return false;
      const action = this.past.pop()!;
      action.undo();
      this.future.unshift(action);
      return true;
    }

    redo() {
      if (this.future.length === 0) return false;
      const action = this.future.shift()!;
      action.execute();
      this.past.push(action);
      return true;
    }

    clear() {
      this.past = [];
      this.future = [];
    }

    get canUndo() { return this.past.length > 0; }
    get canRedo() { return this.future.length > 0; }
  }

  it("should record actions and allow undo", () => {
    const stack = new UndoRedoStack();
    let value = 0;
    stack.record({
      description: "Set value to 1",
      execute: () => { value = 1; },
      undo: () => { value = 0; },
    });
    expect(stack.canUndo).toBe(true);
    expect(stack.canRedo).toBe(false);
    stack.undo();
    expect(value).toBe(0);
    expect(stack.canUndo).toBe(false);
    expect(stack.canRedo).toBe(true);
  });

  it("should support redo after undo", () => {
    const stack = new UndoRedoStack();
    let value = 0;
    stack.record({
      description: "Set value to 1",
      execute: () => { value = 1; },
      undo: () => { value = 0; },
    });
    stack.undo();
    expect(value).toBe(0);
    stack.redo();
    expect(value).toBe(1);
    expect(stack.canUndo).toBe(true);
    expect(stack.canRedo).toBe(false);
  });

  it("should clear redo stack on new action", () => {
    const stack = new UndoRedoStack();
    let value = 0;
    stack.record({
      description: "Set to 1",
      execute: () => { value = 1; },
      undo: () => { value = 0; },
    });
    stack.undo();
    expect(stack.canRedo).toBe(true);
    // New action should clear redo
    stack.record({
      description: "Set to 2",
      execute: () => { value = 2; },
      undo: () => { value = 0; },
    });
    expect(stack.canRedo).toBe(false);
  });

  it("should handle multiple undo/redo operations", () => {
    const stack = new UndoRedoStack();
    const values: number[] = [];
    let current = 0;

    for (let i = 1; i <= 5; i++) {
      const prev = current;
      current = i;
      values.push(i);
      stack.record({
        description: `Set to ${i}`,
        execute: () => { current = i; },
        undo: () => { current = prev; },
      });
    }

    expect(current).toBe(5);
    expect(stack.past.length).toBe(5);

    // Undo 3 times
    stack.undo(); // 5 -> 4
    expect(current).toBe(4);
    stack.undo(); // 4 -> 3
    expect(current).toBe(3);
    stack.undo(); // 3 -> 2
    expect(current).toBe(2);

    expect(stack.past.length).toBe(2);
    expect(stack.future.length).toBe(3);

    // Redo 1 time
    stack.redo(); // 2 -> 3
    expect(current).toBe(3);
    expect(stack.past.length).toBe(3);
    expect(stack.future.length).toBe(2);
  });

  it("should return false when nothing to undo/redo", () => {
    const stack = new UndoRedoStack();
    expect(stack.undo()).toBe(false);
    expect(stack.redo()).toBe(false);
  });

  it("should clear all history", () => {
    const stack = new UndoRedoStack();
    let value = 0;
    stack.record({
      description: "Set to 1",
      execute: () => { value = 1; },
      undo: () => { value = 0; },
    });
    stack.undo();
    expect(stack.canRedo).toBe(true);
    stack.clear();
    expect(stack.canUndo).toBe(false);
    expect(stack.canRedo).toBe(false);
  });

  it("should track descriptions for undo/redo tooltips", () => {
    const stack = new UndoRedoStack();
    stack.record({
      description: "Delete activity 'Foundation'",
      execute: () => {},
      undo: () => {},
    });
    stack.record({
      description: "Update activity 'Framing'",
      execute: () => {},
      undo: () => {},
    });
    expect(stack.past[stack.past.length - 1].description).toBe("Update activity 'Framing'");
    stack.undo();
    expect(stack.future[0].description).toBe("Update activity 'Framing'");
    expect(stack.past[stack.past.length - 1].description).toBe("Delete activity 'Foundation'");
  });
});
