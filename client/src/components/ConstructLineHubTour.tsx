/**
 * ConstructLineHubTour — Guided onboarding tours for the ConstructLine Hub,
 * Cost Library, and Trade Rate Library pages.
 *
 * Each tour runs once per user (persisted in localStorage).
 * Uses the same react-joyride pattern as TakeoffOnboardingTour.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { Joyride, ACTIONS, EVENTS, STATUS } from "react-joyride";
import type { Step, EventData, Controls } from "react-joyride";
import { useMember } from "@/hooks/useMember";
import { useLocation } from "wouter";

const HUB_TOUR_KEY = "alp-constructline-hub-tour-v2";
const COST_LIBRARY_TOUR_KEY = "alp-cost-library-tour-v2";
const LABOR_LIBRARY_TOUR_KEY = "alp-labor-library-tour-v2";

// ─── Tour Steps ────────────────────────────────────────────────────────────────

const HUB_TOUR_STEPS: Step[] = [
  {
    target: '[data-tour="hub-hero"]',
    content:
      "Welcome to the ConstructLine Hub. This is the home base for Basis estimating, pricing libraries, trade rates, and Baseline scheduling.",
    title: "ConstructLine Hub",
    placement: "bottom",
    skipBeacon: true,
  },
  {
    target: '[data-tour="hub-configure-rates"]',
    content:
      "Before a contractor relies on an estimate, they need pricing inputs. Configure the region and labor setup, then review Cost Library and Trade Rate Library.",
    title: "Configure Pricing Inputs",
    placement: "bottom",
    skipBeacon: true,
  },
  {
    target: '[data-tour="hub-recent-projects"]',
    content:
      "Recent Basis projects appear here. Completed bids can move straight into Submit packaging; active bids reopen into the review and estimate workflow.",
    title: "Recent Projects",
    placement: "top",
    skipBeacon: true,
  },
  {
    target: '[data-tour="hub-module-cards"]',
    content:
      "These are the ConstructLine tools: Basis for estimating, Cost Library for unit pricing, Trade Rate Library for labor and crews, and Baseline for CPM scheduling.",
    title: "ConstructLine Tools",
    placement: "top",
    skipBeacon: true,
  },
  {
    target: '[data-tour="hub-whats-new"]',
    content:
      "Stay current with the latest ConstructLine features here. New tools, improvements, and fixes are logged every release.",
    title: "What's New",
    placement: "left",
    skipBeacon: true,
  },
];

const COST_LIBRARY_TOUR_STEPS: Step[] = [
  {
    target: '[data-tour="cost-library-header"]',
    content:
      "Cost Library is the unit-cost source Basis uses when pricing material and cost-library matched scope. It is the contractor's internal price book.",
    title: "Cost Library Powers Basis",
    placement: "bottom",
    skipBeacon: true,
  },
  {
    target: '[data-tour="cost-library-sync"]',
    content:
      "Sync ConstructLine's default pricing to fill gaps, then override rows with your own supplier history, subcontractor pricing, or preferred unit costs.",
    title: "Sync Baseline Pricing",
    placement: "bottom",
    skipBeacon: true,
  },
  {
    target: '[data-tour="cost-library-filter"]',
    content:
      "Search and filter the library by CSI division. Basis uses the same CSI structure when grouping estimate rows and export tabs.",
    title: "Filter by Division",
    placement: "bottom",
    skipBeacon: true,
  },
  {
    target: '[data-tour="cost-library-table"]',
    content:
      "Each row stores description, unit, cost, division, and notes. Edit the rows contractors care about first; custom rows override generic defaults.",
    title: "Edit Unit Costs",
    placement: "top",
    skipBeacon: true,
  },
];

const LABOR_LIBRARY_TOUR_STEPS: Step[] = [
  {
    target: '[data-tour="labor-library-header"]',
    content:
      "Trade Rate Library is where Basis gets fully burdened labor rates and crew assumptions. This is what turns raw quantities into contractor-specific labor cost.",
    title: "Trade Rate Library Powers Basis",
    placement: "bottom",
    skipBeacon: true,
  },
  {
    target: '[data-tour="labor-library-tabs"]',
    content:
      "Use Trade Rates for individual classifications, Burden Config for payroll load, Crew Builder for actual crews, and Rate Profiles when a company has multiple labor setups.",
    title: "Rates, Burden, Crews",
    placement: "bottom",
    skipBeacon: true,
  },
  {
    target: '[data-tour="labor-library-crew-builder"]',
    content:
      "Crew Builder is the practical center of labor pricing. ConstructLine starts users with default crews; contractors tune composition, burden, and rates instead of building from scratch.",
    title: "Crew Builder",
    placement: "top",
    skipBeacon: true,
  },
  {
    target: '[data-tour="labor-library-seed"]',
    content:
      "Use Reconfigure Rates when the company changes region, work type, or labor basis. Basis then prices labor from the updated burdened rates and crew assumptions.",
    title: "Reconfigure Rates",
    placement: "bottom",
    skipBeacon: true,
  },
];

// ─── Shared Joyride config ─────────────────────────────────────────────────────

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

// ─── useTour hook ──────────────────────────────────────────────────────────────

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

    const timer = setTimeout(() => {
      const firstTarget = document.querySelector(steps[0]?.target as string);
      if (firstTarget) {
        startedRef.current = true;
        setStepIndex(0);
        setRun(true);
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [shouldRun, storageKey, steps]);

  const handleEvent = useCallback(
    (data: EventData, _controls: Controls) => {
      const { status, action, index, type } = data;

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
        if (action === ACTIONS.NEXT) setStepIndex(index + 1);
        else if (action === ACTIONS.PREV) setStepIndex(index - 1);
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

// ─── Component ─────────────────────────────────────────────────────────────────

export function ConstructLineHubTour() {
  const { member, isAuthenticated, loading } = useMember();
  const [location] = useLocation();

  const isOnHub =
    location === "/portal/constructline" ||
    location === "/portal/constructline/";
  const isOnCostLibrary =
    location === "/portal/cost-library" || location === "/portal/cost-library/";
  const isOnLaborLibrary =
    location === "/portal/labor-library" ||
    location === "/portal/labor-library/";

  const shouldRunHub = !loading && isAuthenticated && !!member && isOnHub;
  const shouldRunCostLibrary =
    !loading && isAuthenticated && !!member && isOnCostLibrary;
  const shouldRunLaborLibrary =
    !loading && isAuthenticated && !!member && isOnLaborLibrary;

  const hubTour = useTour(HUB_TOUR_STEPS, HUB_TOUR_KEY, shouldRunHub);
  const costLibraryTour = useTour(
    COST_LIBRARY_TOUR_STEPS,
    COST_LIBRARY_TOUR_KEY,
    shouldRunCostLibrary
  );
  const laborLibraryTour = useTour(
    LABOR_LIBRARY_TOUR_STEPS,
    LABOR_LIBRARY_TOUR_KEY,
    shouldRunLaborLibrary
  );

  if (loading || !isAuthenticated) return null;

  return (
    <>
      {isOnHub && (
        <Joyride
          steps={HUB_TOUR_STEPS}
          run={hubTour.run}
          stepIndex={hubTour.stepIndex}
          onEvent={hubTour.handleEvent}
          continuous
          scrollToFirstStep
          options={JOYRIDE_OPTIONS}
          locale={JOYRIDE_LOCALE}
          styles={JOYRIDE_STYLES}
        />
      )}
      {isOnCostLibrary && (
        <Joyride
          steps={COST_LIBRARY_TOUR_STEPS}
          run={costLibraryTour.run}
          stepIndex={costLibraryTour.stepIndex}
          onEvent={costLibraryTour.handleEvent}
          continuous
          scrollToFirstStep
          options={JOYRIDE_OPTIONS}
          locale={JOYRIDE_LOCALE}
          styles={JOYRIDE_STYLES}
        />
      )}
      {isOnLaborLibrary && (
        <Joyride
          steps={LABOR_LIBRARY_TOUR_STEPS}
          run={laborLibraryTour.run}
          stepIndex={laborLibraryTour.stepIndex}
          onEvent={laborLibraryTour.handleEvent}
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

// ─── Reset helpers ─────────────────────────────────────────────────────────────

export function resetConstructLineTours() {
  localStorage.removeItem(HUB_TOUR_KEY);
  localStorage.removeItem(COST_LIBRARY_TOUR_KEY);
  localStorage.removeItem(LABOR_LIBRARY_TOUR_KEY);
}

export function useResetConstructLineTours() {
  return () => {
    resetConstructLineTours();
    window.location.reload();
  };
}
