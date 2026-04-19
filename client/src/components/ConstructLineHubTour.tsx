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

const HUB_TOUR_KEY          = "alp-constructline-hub-tour-v1";
const COST_LIBRARY_TOUR_KEY = "alp-cost-library-tour-v1";
const LABOR_LIBRARY_TOUR_KEY = "alp-labor-library-tour-v1";

// ─── Tour Steps ────────────────────────────────────────────────────────────────

const HUB_TOUR_STEPS: Step[] = [
  {
    target: '[data-tour="hub-hero"]',
    content:
      "Welcome to ConstructLine — your complete construction estimating platform. This hub is your home base for all estimating tools. Everything starts here.",
    title: "Welcome to ConstructLine",
    placement: "bottom",
    skipBeacon: true,
  },
  {
    target: '[data-tour="hub-configure-rates"]',
    content:
      "Before estimating, configure your labor rates here. Tell ConstructLine your work type (commercial or residential), shop type (union or open shop), and region. This calibrates all trade rates to your specific market.",
    title: "Configure Your Labor Rates",
    placement: "bottom",
    skipBeacon: true,
  },
  {
    target: '[data-tour="hub-recent-projects"]',
    content:
      "Your most recent takeoff projects appear here for quick access. Jump back into any project without hunting through the full project list.",
    title: "Recent Projects",
    placement: "top",
    skipBeacon: true,
  },
  {
    target: '[data-tour="hub-module-cards"]',
    content:
      "These four cards are your ConstructLine tools. Start with Quantity Takeoff to upload drawings and extract quantities, then use Cost Library and Trade Rate Library to price them out. CPM Schedule handles your project timeline.",
    title: "Your Estimating Tools",
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
      "The Cost Library stores your material unit costs across all 33 CSI divisions. Think of it as your internal price book — every item here feeds directly into your estimate calculations.",
    title: "Your Cost Library",
    placement: "bottom",
    skipBeacon: true,
  },
  {
    target: '[data-tour="cost-library-sync"]',
    content:
      "Sync ConstructLine's baseline pricing to pre-populate the library with RS Means-calibrated unit costs. You can override any item with your own negotiated rates.",
    title: "Sync Baseline Pricing",
    placement: "bottom",
    skipBeacon: true,
  },
  {
    target: '[data-tour="cost-library-filter"]',
    content:
      "Filter by CSI division to find items quickly. The library is organized by the 33 CSI MasterFormat divisions — the same structure your takeoff uses.",
    title: "Filter by Division",
    placement: "bottom",
    skipBeacon: true,
  },
  {
    target: '[data-tour="cost-library-table"]',
    content:
      "Each row shows the item description, unit of measure, and unit cost. Click any row to edit the cost. Your custom rates override the baseline whenever you run an estimate.",
    title: "Edit Unit Costs",
    placement: "top",
    skipBeacon: true,
  },
];

const LABOR_LIBRARY_TOUR_STEPS: Step[] = [
  {
    target: '[data-tour="labor-library-header"]',
    content:
      "The Trade Rate Library is where you define your crews and their fully-burdened labor rates. ConstructLine uses these rates to calculate labor costs for every item in your takeoff.",
    title: "Trade Rate Library",
    placement: "bottom",
    skipBeacon: true,
  },
  {
    target: '[data-tour="labor-library-tabs"]',
    content:
      "Three tabs: Trade Rates (individual worker rates by trade and classification), Burden Config (payroll taxes and benefits by labor type), and Crew Builder (define multi-trade crews with composition and hourly cost).",
    title: "Three Configuration Tabs",
    placement: "bottom",
    skipBeacon: true,
  },
  {
    target: '[data-tour="labor-library-crew-builder"]',
    content:
      "The Crew Builder is the most important tab. Define your standard crews here — a Concrete Crew, a Framing Crew, a Drywall Crew. Each crew has a composition (how many of each trade) and a calculated hourly cost.",
    title: "Crew Builder",
    placement: "top",
    skipBeacon: true,
  },
  {
    target: '[data-tour="labor-library-seed"]',
    content:
      "Use this to seed your trade rates from the ConstructLine baseline. It applies your configured work type, region, and specialty multipliers to generate accurate starting rates for every trade.",
    title: "Seed from Baseline",
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

  const isOnHub          = location === "/portal/constructline" || location === "/portal/constructline/";
  const isOnCostLibrary  = location === "/portal/cost-library" || location === "/portal/cost-library/";
  const isOnLaborLibrary = location === "/portal/labor-library" || location === "/portal/labor-library/";

  const shouldRunHub          = !loading && isAuthenticated && !!member && isOnHub;
  const shouldRunCostLibrary  = !loading && isAuthenticated && !!member && isOnCostLibrary;
  const shouldRunLaborLibrary = !loading && isAuthenticated && !!member && isOnLaborLibrary;

  const hubTour          = useTour(HUB_TOUR_STEPS,          HUB_TOUR_KEY,          shouldRunHub);
  const costLibraryTour  = useTour(COST_LIBRARY_TOUR_STEPS,  COST_LIBRARY_TOUR_KEY,  shouldRunCostLibrary);
  const laborLibraryTour = useTour(LABOR_LIBRARY_TOUR_STEPS, LABOR_LIBRARY_TOUR_KEY, shouldRunLaborLibrary);

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
