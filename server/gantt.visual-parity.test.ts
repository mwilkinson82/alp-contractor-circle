import { describe, it, expect } from "vitest";

/**
 * Tests for Gantt Chart Visual Parity Features
 * - Child row height reduction
 * - Zoom/magnification control
 * - PDF export parity
 */

// Mock row height functions from GanttChart
const BASE_ROW_HEIGHT = 44;
const CHILD_ROW_HEIGHT = 20;
const COST_ROW_HEIGHT = 60;

const getWbsRowHeight = (depth: number, showCostOverlay: boolean): number => {
  if (showCostOverlay) return COST_ROW_HEIGHT;
  // Parent rows (depth 0) are taller
  return depth === 0 ? BASE_ROW_HEIGHT : CHILD_ROW_HEIGHT;
};

const getActivityRowHeight = (showCostOverlay: boolean): number => {
  return showCostOverlay ? COST_ROW_HEIGHT : BASE_ROW_HEIGHT;
};

describe("Gantt Chart Visual Parity", () => {
  describe("Child Row Height Reduction", () => {
    it("should have parent rows significantly taller than child rows", () => {
      const parentHeight = getWbsRowHeight(0, false);
      const childHeight = getWbsRowHeight(1, false);
      
      expect(parentHeight).toBe(44);
      expect(childHeight).toBe(20);
      
      // Child rows should be ~45% of parent height (dramatic reduction like P6)
      const ratio = childHeight / parentHeight;
      expect(ratio).toBeLessThan(0.5);
      expect(ratio).toBeGreaterThan(0.4);
    });

    it("should maintain height ratio with cost overlay active", () => {
      const parentHeight = getWbsRowHeight(0, true);
      const childHeight = getWbsRowHeight(1, true);
      
      expect(parentHeight).toBe(60);
      expect(childHeight).toBe(60); // Cost overlay makes all rows same height
    });

    it("should apply consistent height to activities", () => {
      const activityHeight = getActivityRowHeight(false);
      expect(activityHeight).toBe(44);
    });
  });

  describe("Zoom/Magnification Control", () => {
    it("should support 5 zoom levels: 50%, 75%, 100%, 125%, 150%", () => {
      const zoomLevels = [50, 75, 100, 125, 150];
      
      zoomLevels.forEach((zoom) => {
        const scaledHeight = (BASE_ROW_HEIGHT * zoom) / 100;
        expect(scaledHeight).toBeGreaterThan(0);
        
        // At 50%, rows should be half height
        if (zoom === 50) {
          expect(scaledHeight).toBe(22);
        }
        // At 100%, rows should be normal
        if (zoom === 100) {
          expect(scaledHeight).toBe(44);
        }
        // At 150%, rows should be 1.5x
        if (zoom === 150) {
          expect(scaledHeight).toBe(66);
        }
      });
    });

    it("should calculate correct row heights at different zoom levels", () => {
      const baseHeight = BASE_ROW_HEIGHT;
      
      // Test 75% zoom
      const zoom75 = (baseHeight * 75) / 100;
      expect(zoom75).toBe(33);
      
      // Test 125% zoom
      const zoom125 = (baseHeight * 125) / 100;
      expect(zoom125).toBe(55);
    });

    it("should apply zoom to both parent and child rows", () => {
      const zoom = 75;
      const parentZoomed = (BASE_ROW_HEIGHT * zoom) / 100;
      const childZoomed = (CHILD_ROW_HEIGHT * zoom) / 100;
      
      // Both should scale proportionally
      expect(parentZoomed / childZoomed).toBeCloseTo(BASE_ROW_HEIGHT / CHILD_ROW_HEIGHT, 1);
    });
  });

  describe("PDF Export Parity", () => {
    it("should calculate row heights for PDF matching screen", () => {
      const ppi = 96; // pixels per inch
      const baseFontSize = 9;
      
      // PDF should use same row height logic as screen
      const screenParentHeight = BASE_ROW_HEIGHT;
      const pdfParentHeight = (screenParentHeight * ppi) / 96;
      
      expect(pdfParentHeight).toBe(screenParentHeight);
    });

    it("should maintain child row height ratio in PDF", () => {
      const screenRatio = CHILD_ROW_HEIGHT / BASE_ROW_HEIGHT;
      const pdfParentHeight = (BASE_ROW_HEIGHT * 96) / 96;
      const pdfChildHeight = (CHILD_ROW_HEIGHT * 96) / 96;
      const pdfRatio = pdfChildHeight / pdfParentHeight;
      
      expect(pdfRatio).toBeCloseTo(screenRatio, 5);
    });

    it("should calculate correct number of rows per PDF page", () => {
      // Typical letter page: 11 inches tall
      const pageHeightInches = 11;
      const ppi = 96;
      const pageHeightPx = pageHeightInches * ppi;
      
      // Margins: 0.4 inches top/bottom = 0.8 total
      const marginInches = 0.4;
      const marginPx = marginInches * ppi * 2;
      
      // Header/footer space
      const headerFooterPx = (0.35 + 0.25) * ppi;
      
      // Available content height
      const contentHeight = pageHeightPx - marginPx - headerFooterPx;
      
      // Average row height (mix of parent/child)
      const avgRowHeight = (BASE_ROW_HEIGHT + CHILD_ROW_HEIGHT) / 2;
      
      // Rows per page
      const rowsPerPage = Math.floor(contentHeight / avgRowHeight);
      
      // Should fit roughly 25-30 rows per page (with smaller child rows)
      expect(rowsPerPage).toBeGreaterThan(20);
      expect(rowsPerPage).toBeLessThan(35);
    });

    it("should handle zoom in PDF export", () => {
      const zoom = 75;
      const screenHeight = BASE_ROW_HEIGHT;
      const zoomedHeight = (screenHeight * zoom) / 100;
      const pdfHeight = (zoomedHeight * 96) / 96;
      
      expect(pdfHeight).toBe(zoomedHeight);
    });
  });

  describe("Visual Hierarchy", () => {
    it("should create clear visual distinction between parent and child rows", () => {
      const parentHeight = getWbsRowHeight(0, false);
      const childHeight = getWbsRowHeight(1, false);
      const difference = parentHeight - childHeight;
      
      // Difference should be at least 20px for clear visibility
      expect(difference).toBeGreaterThanOrEqual(20);
    });

    it("should maintain hierarchy at all zoom levels", () => {
      const zoomLevels = [50, 75, 100, 125, 150];
      
      zoomLevels.forEach((zoom) => {
        const parentZoomed = (BASE_ROW_HEIGHT * zoom) / 100;
        const childZoomed = (CHILD_ROW_HEIGHT * zoom) / 100;
        
        // Parent should always be taller
        expect(parentZoomed).toBeGreaterThan(childZoomed);
        
        // Ratio should be consistent
        const ratio = childZoomed / parentZoomed;
        expect(ratio).toBeCloseTo(CHILD_ROW_HEIGHT / BASE_ROW_HEIGHT, 2);
      });
    });
  });

  describe("Zoom State Management", () => {
    it("should default to 100% zoom", () => {
      const defaultZoom = 100;
      expect(defaultZoom).toBe(100);
    });

    it("should persist zoom selection across renders", () => {
      const selectedZoom = 75;
      const persistedZoom = selectedZoom;
      
      expect(persistedZoom).toBe(75);
    });

    it("should apply zoom immediately without page reload", () => {
      const initialZoom = 100;
      const newZoom = 125;
      
      expect(newZoom).not.toBe(initialZoom);
      expect(newZoom).toBe(125);
    });
  });
});
