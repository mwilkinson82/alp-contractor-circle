/**
 * TakeoffOnboardingTour — Guided product tour for ConstructLine Basis.
 * Uses react-joyride v3 to walk through the current Basis workflow.
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

const LIST_TOUR_KEY = "alp-basis-list-tour-v2";
const DETAIL_TOUR_KEY = "alp-basis-detail-tour-v2";

/** Tour steps for the Takeoff Project List page (/portal/takeoff) */
const LIST_TOUR_STEPS: Step[] = [
  {
    target: '[data-tour="takeoff-new-project"]',
    content:
      "Start here to create a new Basis project. Give it the job name, then upload drawings and choose the bid mode so the review surface matches the work you are pricing.",
    title: "Step 1: Create a New Basis Project",
    placement: "bottom",
    skipBeacon: true,
  },
  {
    target: '[data-tour="basis-pricing-libraries"]',
    content:
      "Before a real contractor trusts the numbers, they should review the Cost Library and Trade Rate Library. Cost Library controls material and unit pricing. Trade Rate Library controls fully burdened labor rates and crews.",
    title: "Pricing Inputs Matter",
    placement: "bottom",
    skipBeacon: true,
  },
  {
    target: '[data-tour="takeoff-project-grid"]',
    content:
      "This is the Bid Desk: the archive of estimating projects that open into ConstructLine Basis. Use it to see status, sheet count, region, bid mode, and bid value at a glance.",
    title: "Bid Desk",
    placement: "top",
    skipBeacon: true,
  },
];

/** Tour steps for the Takeoff Detail page (/takeoff/:id) */
const DETAIL_TOUR_STEPS: Step[] = [
  {
    target: '[data-tour="takeoff-upload-area"]',
    content:
      "Drag and drop construction drawings here — PDFs or images. Multi-page PDFs are split into sheets, indexed, and processed by Basis.",
    title: "Step 1: Upload Your Drawings",
    placement: "bottom",
    skipBeacon: true,
  },
  {
    target: '[data-tour="takeoff-analyze-btn"]',
    content:
      "Run Basis analysis after upload. You will choose bid mode, project type, currency, cost region, and scope setup before analysis starts.",
    title: "Step 2: Start Basis Analysis",
    placement: "top",
    skipBeacon: true,
  },
  {
    target: '[data-tour="takeoff-settings"]',
    content:
      "Change project settings anytime — bid mode, scope notes, currency, region, and pricing setup. If the scope changes, re-run analysis to refresh the estimate.",
    title: "Project Settings",
    placement: "bottom",
    skipBeacon: true,
  },
  {
    target: '[data-tour="takeoff-sheet-grid"]',
    content:
      "Uploaded drawing sheets appear here. Open Drawing Navigator or full-screen preview to review source evidence, inspect what Basis found, and add missed scope tied to a specific sheet.",
    title: "Drawing Sheets",
    placement: "top",
    skipBeacon: true,
  },
  {
    target: '[data-tour="takeoff-tabs"]',
    content:
      "Basis moves through drawing review, scope review, estimating, and submit packaging. Review decides what belongs, Estimate decides what it costs, Submit packages the bid.",
    title: "Review, Estimate, Submit",
    placement: "bottom",
    skipBeacon: true,
  },
  {
    target: '[data-tour="takeoff-summary-bar"]',
    content:
      "The command area shows bid readiness, accepted cost, review status, and estimate actions. Use Add Item when the estimator catches scope that AI missed.",
    title: "Basis Command Center",
    placement: "bottom",
    skipBeacon: true,
  },
  {
    target: '[data-tour="takeoff-consolidate-btn"]',
    content:
      "The analysis pipeline runs automatically after upload. Use Re-run Analysis only when you change scope, add sheets, or need Basis to rebuild the estimate from the current drawing set.",
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
      console.log(`[TakeoffTour:${storageKey}] Checking targets...`, {
        firstTarget: !!firstTarget,
      });
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

      console.log(`[TakeoffTour:${storageKey}] Event:`, {
        type,
        action,
        status,
        index,
      });

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

  const isOnListPage =
    location === "/portal/takeoff" || location === "/portal/takeoff/";
  const isOnDetailPage = /^\/takeoff\/\d+/.test(location);

  const shouldRunList = !loading && isAuthenticated && !!member && isOnListPage;
  const shouldRunDetail =
    !loading && isAuthenticated && !!member && isOnDetailPage;

  const listTour = useTour(LIST_TOUR_STEPS, LIST_TOUR_KEY, shouldRunList);
  const detailTour = useTour(
    DETAIL_TOUR_STEPS,
    DETAIL_TOUR_KEY,
    shouldRunDetail
  );

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
