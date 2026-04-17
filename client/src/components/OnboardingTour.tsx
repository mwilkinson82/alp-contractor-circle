/**
 * OnboardingTour — Guided product tour for first-time portal users.
 * Uses react-joyride v3 to walk through key portal features with spotlight callouts.
 * Only runs on the portal dashboard page where the target elements exist.
 * Shows only once per user (persisted in localStorage).
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { Joyride, ACTIONS, EVENTS, STATUS } from "react-joyride";
import type { Step, EventData, Controls } from "react-joyride";
import { useMember } from "@/hooks/useMember";
import { useLocation } from "wouter";

// Bump version to invalidate old localStorage entries from broken tour
const TOUR_STORAGE_KEY = "alp-portal-tour-completed-v2";

/** Tour steps targeting data-tour attributes on the dashboard and sidebar */
const TOUR_STEPS: Step[] = [
  {
    target: '[data-tour="welcome-header"]',
    content:
      "Welcome to The Contractor Circle portal! This is your home base. Let me walk you through the key features so you can hit the ground running.",
    title: "Welcome to Your Portal",
    placement: "bottom",
    skipBeacon: true,
  },
  {
    target: '[data-tour="subscription-status"]',
    content:
      "Here you can see your subscription status, plan details, and renewal date. Everything about your membership at a glance.",
    title: "Subscription Status",
    placement: "bottom",
    skipBeacon: true,
  },
  {
    target: '[data-tour="nav-replay-library"]',
    content:
      "Watch recordings of past Contractor Circle calls and bootcamp sessions. New replays are added after every live session.",
    title: "Replay Library",
    placement: "right",
    skipBeacon: true,
  },
  {
    target: '[data-tour="nav-templates"]',
    content:
      "Download ready-to-use proposal templates, contract templates, and SOPs. Request new ones if you don't see what you need.",
    title: "Templates & SOPs",
    placement: "right",
    skipBeacon: true,
  },
  {
    target: '[data-tour="nav-constructline"]',
    content:
      "ConstructLine is your construction management toolkit. It includes a CPM Scheduler and AI-powered Quantity Takeoff — tools built specifically for contractors.",
    title: "ConstructLine Suite",
    placement: "right",
    skipBeacon: true,
  },
  {
    target: '[data-tour="quick-links"]',
    content:
      "Quick links to your most-used resources: replays, templates, Discord community, and the next live call. Everything one click away.",
    title: "Quick Access",
    placement: "top",
    skipBeacon: true,
  },
];

export function OnboardingTour() {
  const { member, isAuthenticated, loading } = useMember();
  const [location] = useLocation();
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const startedRef = useRef(false);

  // Only run the tour on the portal dashboard where the target elements exist
  const isOnDashboard = location === "/portal" || location === "/portal/";

  useEffect(() => {
    // Don't start while still loading auth
    if (loading) return;
    if (!isAuthenticated || !member) return;
    if (!isOnDashboard) {
      // If we navigate away from dashboard, stop the tour
      if (run) {
        setRun(false);
      }
      return;
    }

    // Check if tour was already completed (v2 key)
    const tourCompleted = localStorage.getItem(TOUR_STORAGE_KEY);
    if (tourCompleted) return;

    // Prevent double-start
    if (startedRef.current) return;

    // Wait for DOM elements to render, then verify targets exist before starting
    const timer = setTimeout(() => {
      const firstTarget = document.querySelector('[data-tour="welcome-header"]');
      console.log("[OnboardingTour] Checking for targets...", {
        firstTarget: !!firstTarget,
        isOnDashboard,
        isAuthenticated,
        member: !!member,
      });
      if (firstTarget) {
        startedRef.current = true;
        setStepIndex(0);
        setRun(true);
        console.log("[OnboardingTour] Starting tour!");
      } else {
        console.log("[OnboardingTour] Target elements not found, skipping tour");
      }
    }, 3000); // Longer delay to ensure layout is fully rendered

    return () => clearTimeout(timer);
  }, [loading, isAuthenticated, member, isOnDashboard]);

  const handleEvent = useCallback((data: EventData, controls: Controls) => {
    const { status, action, index, type } = data;

    console.log("[OnboardingTour] Event:", { type, action, status, index });

    // Tour finished or skipped
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
      localStorage.setItem(TOUR_STORAGE_KEY, "true");
      startedRef.current = false;
      return;
    }

    // Handle target not found — skip to next step or end tour
    if (type === EVENTS.TARGET_NOT_FOUND) {
      console.log("[OnboardingTour] Target not found for step", index, "- skipping");
      const nextIndex = index + 1;
      if (nextIndex < TOUR_STEPS.length) {
        setStepIndex(nextIndex);
      } else {
        setRun(false);
        localStorage.setItem(TOUR_STORAGE_KEY, "true");
        startedRef.current = false;
      }
      return;
    }

    // Handle step navigation
    if (type === EVENTS.STEP_AFTER) {
      if (action === ACTIONS.NEXT) {
        setStepIndex(index + 1);
      } else if (action === ACTIONS.PREV) {
        setStepIndex(index - 1);
      }
    }

    // Handle close button
    if (action === ACTIONS.CLOSE || action === ACTIONS.SKIP) {
      setRun(false);
      localStorage.setItem(TOUR_STORAGE_KEY, "true");
      startedRef.current = false;
    }
  }, []);

  // Don't render at all if not on dashboard or not authenticated
  if (loading || !isAuthenticated || !isOnDashboard) return null;

  return (
    <Joyride
      steps={TOUR_STEPS}
      run={run}
      stepIndex={stepIndex}
      onEvent={handleEvent}
      continuous
      scrollToFirstStep
      options={{
        overlayColor: "rgba(0, 0, 0, 0.75)",
        primaryColor: "#E8622C",
        backgroundColor: "#1a1f35",
        textColor: "#F5F0E8",
        zIndex: 10000,
        showProgress: true,
        spotlightRadius: 16,
        overlayClickAction: false,
        blockTargetInteraction: false,
        targetWaitTimeout: 3000,
      }}
      locale={{
        back: "Back",
        close: "Close",
        last: "Get Started!",
        next: "Next",
        skip: "Skip Tour",
      }}
      styles={{
        tooltip: {
          borderRadius: "16px",
          border: "1px solid rgba(255,255,255,0.1)",
          padding: "20px 24px",
          boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
        },
        tooltipTitle: {
          fontSize: "16px",
          fontWeight: 700,
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
          fontWeight: 600,
          padding: "8px 20px",
        },
        buttonBack: {
          fontSize: "13px",
          marginRight: "8px",
        },
        buttonSkip: {
          fontSize: "12px",
        },
      }}
    />
  );
}

/**
 * Reset tour so it shows again on next dashboard visit.
 */
export function resetTour() {
  localStorage.removeItem(TOUR_STORAGE_KEY);
}

/**
 * Hook to manually trigger the tour (e.g., from a "Restart Tour" button).
 */
export function useResetTour() {
  return () => {
    resetTour();
    window.location.reload();
  };
}
