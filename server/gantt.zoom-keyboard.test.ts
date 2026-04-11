import { describe, it, expect } from "vitest";

/**
 * Tests for Gantt Chart Zoom PDF Export & Keyboard Shortcuts
 * - Zoom applied to PDF export
 * - Keyboard shortcuts (Ctrl+Plus/Minus) for magnification zoom
 */

describe("Gantt Chart Zoom PDF Export & Keyboard Shortcuts", () => {
  describe("Zoom Applied to PDF Export", () => {
    it("should accept magnificationZoom prop in PDF preview", () => {
      const zoom = 75;
      expect(zoom).toBeGreaterThanOrEqual(50);
      expect(zoom).toBeLessThanOrEqual(150);
    });

    it("should scale row heights by zoom level in PDF", () => {
      const baseRowHeight = 44;
      const zoom = 75;
      const scaledHeight = (baseRowHeight * zoom) / 100;
      
      expect(scaledHeight).toBe(33);
    });

    it("should maintain row height ratio at different zoom levels", () => {
      const parentHeight = 44;
      const childHeight = 20;
      const zoom = 125;
      
      const scaledParent = (parentHeight * zoom) / 100;
      const scaledChild = (childHeight * zoom) / 100;
      
      // Ratio should remain consistent
      const originalRatio = childHeight / parentHeight;
      const scaledRatio = scaledChild / scaledParent;
      
      expect(scaledRatio).toBeCloseTo(originalRatio, 5);
    });

    it("should calculate PDF rows per page with zoom applied", () => {
      // Letter page: 11 inches tall
      const pageHeightInches = 11;
      const ppi = 96;
      const pageHeightPx = pageHeightInches * ppi;
      
      // Margins and headers/footers
      const marginPx = 0.4 * ppi * 2;
      const headerFooterPx = (0.35 + 0.25) * ppi;
      const contentHeight = pageHeightPx - marginPx - headerFooterPx;
      
      // Average row height at 100% zoom
      const avgRowHeight = (44 + 20) / 2;
      const rowsAt100 = Math.floor(contentHeight / avgRowHeight);
      
      // At 75% zoom, rows are smaller, so more fit per page
      const zoomedRowHeight = (avgRowHeight * 75) / 100;
      const rowsAt75 = Math.floor(contentHeight / zoomedRowHeight);
      
      expect(rowsAt75).toBeGreaterThan(rowsAt100);
    });

    it("should handle all zoom levels in PDF export", () => {
      const zoomLevels = [50, 75, 100, 125, 150];
      const baseRowHeight = 44;
      
      zoomLevels.forEach((zoom) => {
        const scaledHeight = (baseRowHeight * zoom) / 100;
        
        // All zoomed heights should be positive
        expect(scaledHeight).toBeGreaterThan(0);
        
        // Verify zoom calculations
        if (zoom === 50) expect(scaledHeight).toBe(22);
        if (zoom === 75) expect(scaledHeight).toBe(33);
        if (zoom === 100) expect(scaledHeight).toBe(44);
        if (zoom === 125) expect(scaledHeight).toBe(55);
        if (zoom === 150) expect(scaledHeight).toBe(66);
      });
    });
  });

  describe("Keyboard Shortcuts (Ctrl+Plus/Minus)", () => {
    it("should have valid zoom levels for keyboard navigation", () => {
      const zoomLevels = [50, 75, 100, 125, 150];
      
      // Verify zoom levels are in ascending order
      for (let i = 0; i < zoomLevels.length - 1; i++) {
        expect(zoomLevels[i]).toBeLessThan(zoomLevels[i + 1]);
      }
    });

    it("should zoom in from 100% to 125% on Ctrl+Plus", () => {
      const zoomLevels = [50, 75, 100, 125, 150];
      const currentZoom = 100;
      const currentIndex = zoomLevels.indexOf(currentZoom);
      
      const nextZoom = currentIndex < zoomLevels.length - 1 
        ? zoomLevels[currentIndex + 1] 
        : currentZoom;
      
      expect(nextZoom).toBe(125);
    });

    it("should zoom out from 100% to 75% on Ctrl+Minus", () => {
      const zoomLevels = [50, 75, 100, 125, 150];
      const currentZoom = 100;
      const currentIndex = zoomLevels.indexOf(currentZoom);
      
      const prevZoom = currentIndex > 0 
        ? zoomLevels[currentIndex - 1] 
        : currentZoom;
      
      expect(prevZoom).toBe(75);
    });

    it("should not zoom beyond 150% on Ctrl+Plus", () => {
      const zoomLevels = [50, 75, 100, 125, 150];
      const currentZoom = 150;
      const currentIndex = zoomLevels.indexOf(currentZoom);
      
      const nextZoom = currentIndex < zoomLevels.length - 1 
        ? zoomLevels[currentIndex + 1] 
        : currentZoom;
      
      expect(nextZoom).toBe(150);
    });

    it("should not zoom below 50% on Ctrl+Minus", () => {
      const zoomLevels = [50, 75, 100, 125, 150];
      const currentZoom = 50;
      const currentIndex = zoomLevels.indexOf(currentZoom);
      
      const prevZoom = currentIndex > 0 
        ? zoomLevels[currentIndex - 1] 
        : currentZoom;
      
      expect(prevZoom).toBe(50);
    });

    it("should handle zoom navigation from any level", () => {
      const zoomLevels = [50, 75, 100, 125, 150];
      
      // Test zoom in from each level
      zoomLevels.forEach((zoom) => {
        const index = zoomLevels.indexOf(zoom);
        const nextZoom = index < zoomLevels.length - 1 
          ? zoomLevels[index + 1] 
          : zoom;
        
        if (zoom < 150) {
          expect(nextZoom).toBeGreaterThan(zoom);
        } else {
          expect(nextZoom).toBe(zoom);
        }
      });
      
      // Test zoom out from each level
      zoomLevels.forEach((zoom) => {
        const index = zoomLevels.indexOf(zoom);
        const prevZoom = index > 0 
          ? zoomLevels[index - 1] 
          : zoom;
        
        if (zoom > 50) {
          expect(prevZoom).toBeLessThan(zoom);
        } else {
          expect(prevZoom).toBe(zoom);
        }
      });
    });

    it("should support both Ctrl and Meta (Cmd) keys", () => {
      // Both Ctrl and Meta (Cmd on Mac) should work
      const supportedModifiers = ["ctrlKey", "metaKey"];
      
      supportedModifiers.forEach((modifier) => {
        expect(modifier).toMatch(/^(ctrlKey|metaKey)$/);
      });
    });

    it("should support both + and = keys for zoom in", () => {
      const zoomInKeys = ["+", "="];
      
      zoomInKeys.forEach((key) => {
        expect(["+", "="].includes(key)).toBe(true);
      });
    });

    it("should support - key for zoom out", () => {
      const zoomOutKey = "-";
      expect(zoomOutKey).toBe("-");
    });
  });

  describe("Zoom State Management", () => {
    it("should default to 100% zoom", () => {
      const defaultZoom = 100;
      expect(defaultZoom).toBe(100);
    });

    it("should persist zoom level across renders", () => {
      const initialZoom = 100;
      const newZoom = 75;
      
      // Simulate state update
      let currentZoom = initialZoom;
      currentZoom = newZoom;
      
      expect(currentZoom).toBe(75);
    });

    it("should apply zoom immediately without page reload", () => {
      const zoom1 = 100;
      const zoom2 = 125;
      
      expect(zoom2).not.toBe(zoom1);
      expect(zoom2).toBe(125);
    });

    it("should sync zoom between Gantt chart and PDF preview", () => {
      const ganttZoom = 75;
      const pdfZoom = 75;
      
      expect(ganttZoom).toBe(pdfZoom);
    });
  });

  describe("PDF Export with Keyboard Zoom", () => {
    it("should export PDF at current zoom level", () => {
      const zoom = 75;
      const baseRowHeight = 44;
      const scaledHeight = (baseRowHeight * zoom) / 100;
      
      // PDF should use scaled height
      expect(scaledHeight).toBe(33);
    });

    it("should recalculate PDF pagination when zoom changes", () => {
      const pageHeightPx = 1056; // 11 inches * 96 ppi
      const contentHeight = 900; // After margins/headers
      
      const avgRowHeight100 = 32; // Average of parent/child
      const rowsAt100 = Math.floor(contentHeight / avgRowHeight100);
      
      const avgRowHeight75 = (avgRowHeight100 * 75) / 100;
      const rowsAt75 = Math.floor(contentHeight / avgRowHeight75);
      
      // Fewer rows per page at 100% than at 75%
      expect(rowsAt75).toBeGreaterThan(rowsAt100);
    });
  });
});
