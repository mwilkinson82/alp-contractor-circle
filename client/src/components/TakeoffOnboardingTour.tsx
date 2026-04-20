/**
 * TakeoffOnboardingTour — Guided product tour for the ConstructLine Takeoff application.
 * Uses react-joyride v3 to walk through the takeoff workflow step-by-step.
 * Two tour variants:
 *   1. TakeoffList tour — runs on /portal/takeoff (project list page)
 *   2. TakeoffDetail tour — runs on /takeoff/:id (project detail page)
 * Each shows only once per user (persisted in localStorage).
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { Joyride, ACTIONS, EVENTS, STATUS } from "react-joyride";
import type { Step, EventData, Controls } from "react-joyride";
import { useMember } from "@/hooks/useMember";
import { useLocation } from "wouter";

const LIST_TOUR_KEY = "alp-takeoff-list-tour-v1";
const DETAIL_TOUR_KEY = "alp-takeoff-detail-tour-v1";

/** Tour steps for the Takeoff Project List page (/portal/takeoff) */
const LIST_TOUR_STEPS: Step[] = [
  {
    target: '[data-tour="takeoff-new-project"]',
    content:
      "Start here! Click \"New Takeoff\" to create a project. Give it a name (like the job name) and you'll be taken to the project page where you upload your drawings.",
    title: "Step 1: Create a New Takeoff Project",
    placement: "bottom",
    skipBeacon: true,
  },
  {
    target: '[data-tour="takeoff-project-grid"]',
    content:
      "All your takeoff projects show up here as cards. You can see the status, number of sheets, and estimated cost at a glance. Click any card to open it.",
    title: "Your Takeoff Projects",
    placement: "top",
    skipBeacon: true,
  },
];

/** Tour steps for the Takeoff Detail page (/takeoff/:id) */
const DETAIL_TOUR_STEPS: Step[] = [
  {
    target: '[data-tour="takeoff-upload-area"]',
    content:
      "Drag and drop your construction drawings here — PDFs or images. Multi-page PDFs are automatically split into individual sheets. Each sheet gets analyzed separately.",
    title: "Step 1: Upload Your Drawings",
    placement: "bottom",
    skipBeacon: true,
  },
  {
    target: '[data-tour="takeoff-analyze-btn"]',
    content:
      "After uploading, hit this button to run the ConstructLine analysis. You'll pick your currency, CSI divisions to include, and cost region before it starts. The ConstructLine engine reads every sheet and extracts line items with quantities and costs.",
    title: "Step 2: Analyze Drawings",
    placement: "top",
    skipBeacon: true,
  },
  {
    target: '[data-tour="takeoff-settings"]',
    content:
      "Change your project settings anytime — currency, CSI divisions, cost region, and scope notes. If you change divisions, you can re-analyze to update results.",
    title: "Project Settings",
    placement: "bottom",
    skipBeacon: true,
  },
  {
    target: '[data-tour="takeoff-sheet-grid"]',
    content:
      "Your uploaded drawing sheets appear here. Click any sheet to preview it, open it fullscreen, or enter markup mode to measure distances, areas, and counts directly on the drawing.",
    title: "Drawing Sheets",
    placement: "top",
    skipBeacon: true,
  },
  {
    target: '[data-tour="takeoff-tabs"]',
    content:
      "Switch between the Drawing Sheets tab (upload & markup) and the Quantity Takeoff tab (review extracted line items, costs, and export).",
    title: "Sheets vs. Quantity Takeoff",
    placement: "bottom",
    skipBeacon: true,
  },
  {
    target: '[data-tour="takeoff-summary-bar"]',
    content:
      "The summary bar shows your line item count, CSI divisions, reviewed count, and total estimated cost. Use the action buttons to Re-run Analysis, Re-price, Export, Import, Add Items, or open the Bid Calculator. Additional tools are in the More menu.",
    title: "Quantity Takeoff Summary & Tools",
    placement: "bottom",
    skipBeacon: true,
  },
  {
    target: '[data-tour="takeoff-consolidate-btn"]',
    content:
      "The full analysis pipeline runs automatically after upload — no action needed. Use Re-run Analysis to re-process after editing scope, adding sheets, or changing settings. It merges duplicates, converts lump sums to measured quantities, calculates CY volumes, and removes out-of-scope items.",
    title: "Re-run Analysis",
    placement: "bottom",
    skipBeacon: true,
  },
];

/** Shared Joyride styles */
const JOYRIDE_OPTIONS = {
  overlayColor: "rgba(0, 0, 0, 0.75)",
  primaryColor: "#E8622C",
  backgroundColor: "#1a1f35",
  textColor: "#F5F0E8",
  zIndex: 10000,
  showProgress: true,
  spotlightRadius: 16,
  overlayClickAction: false as const,
  blockTargetInteraction: false,
  targetWaitTimeout: 3000,
};

const JOYRIDE_LOCALE = {
  back: "Back",
  close: "Close",
  last: "Got It!",
  next: "Next",
  skip: "Skip Tour",
};

const JOYRIDE_STYLES = {
  tooltip: {
    borderRadius: "16px",
    border: "1px solid rgba(255,255,255,0.1)",
    padding: "20px 24px",
    boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
  },
  tooltipTitle: {
    fontSize: "16px",
    fontWeight: 700 as const,
    marginBottom: "8px",
  },
  tooltipContent: {
    fontSize: "14px",
    lineHeight: "1.6",
    padding: "8px 0",
  },
  buttonPrimary: {
    borderRadius: "10px",
    fontSize: "13px",
    fontWeight: 600 as const,
    padding: "8px 20px",
  },
  buttonBack: {
    fontSize: "13px",
    marginRight: "8px",
  },
  buttonSkip: {
    fontSize: "12px",
  },
};

function useTour(steps: Step[], storageKey: string, shouldRun: boolean) {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!shouldRun) {
      if (run) setRun(false);
      return;
    }

    const completed = localStorage.getItem(storageKey);
    if (completed) return;
    if (startedRef.current) return;

    // Wait for DOM elements to render
    const timer = setTimeout(() => {
      const firstTarget = document.querySelector(steps[0]?.target as string);
      console.log(`[TakeoffTour:${storageKey}] Checking targets...`, { firstTarget: !!firstTarget });
      if (firstTarget) {
        startedRef.current = true;
        setStepIndex(0);
        setRun(true);
        console.log(`[TakeoffTour:${storageKey}] Starting tour!`);
      } else {
        console.log(`[TakeoffTour:${storageKey}] Target not found, skipping`);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [shouldRun, storageKey, steps]);

  const handleEvent = useCallback(
    (data: EventData, controls: Controls) => {
      const { status, action, index, type } = data;

      console.log(`[TakeoffTour:${storageKey}] Event:`, { type, action, status, index });

      if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
        setRun(false);
        localStorage.setItem(storageKey, "true");
        startedRef.current = false;
        return;
      }

      if (type === EVENTS.TARGET_NOT_FOUND) {
        const nextIndex = index + 1;
        if (nextIndex < steps.length) {
          setStepIndex(nextIndex);
        } else {
          setRun(false);
          localStorage.setItem(storageKey, "true");
          startedRef.current = false;
        }
        return;
      }

      if (type === EVENTS.STEP_AFTER) {
        if (action === ACTIONS.NEXT) {
          setStepIndex(index + 1);
        } else if (action === ACTIONS.PREV) {
          setStepIndex(index - 1);
        }
      }

      if (action === ACTIONS.CLOSE || action === ACTIONS.SKIP) {
        setRun(false);
        localStorage.setItem(storageKey, "true");
        startedRef.current = false;
      }
    },
    [storageKey, steps.length]
  );

  return { run, stepIndex, handleEvent };
}

export function TakeoffOnboardingTour() {
  const { member, isAuthenticated, loading } = useMember();
  const [location] = useLocation();

  const isOnListPage = location === "/portal/takeoff" || location === "/portal/takeoff/";
  const isOnDetailPage = /^\/takeoff\/\d+/.test(location);

  const shouldRunList = !loading && isAuthenticated && !!member && isOnListPage;
  const shouldRunDetail = !loading && isAuthenticated && !!member && isOnDetailPage;

  const listTour = useTour(LIST_TOUR_STEPS, LIST_TOUR_KEY, shouldRunList);
  const detailTour = useTour(DETAIL_TOUR_STEPS, DETAIL_TOUR_KEY, shouldRunDetail);

  if (loading || !isAuthenticated) return null;

  return (
    <>
      {isOnListPage && (
        <Joyride
          steps={LIST_TOUR_STEPS}
          run={listTour.run}
          stepIndex={listTour.stepIndex}
          onEvent={listTour.handleEvent}
          continuous
          scrollToFirstStep
          options={JOYRIDE_OPTIONS}
          locale={JOYRIDE_LOCALE}
          styles={JOYRIDE_STYLES}
        />
      )}
      {isOnDetailPage && (
        <Joyride
          steps={DETAIL_TOUR_STEPS}
          run={detailTour.run}
          stepIndex={detailTour.stepIndex}
          onEvent={detailTour.handleEvent}
          continuous
          scrollToFirstStep
          options={JOYRIDE_OPTIONS}
          locale={JOYRIDE_LOCALE}
          styles={JOYRIDE_STYLES}
        />
      )}
    </>
  );
}

/**
 * Reset takeoff tours so they show again.
 */
export function resetTakeoffTours() {
  localStorage.removeItem(LIST_TOUR_KEY);
  localStorage.removeItem(DETAIL_TOUR_KEY);
}

/**
 * Hook to manually trigger takeoff tour restart.
 */
export function useResetTakeoffTours() {
  return () => {
    resetTakeoffTours();
    window.location.reload();
  };
}
