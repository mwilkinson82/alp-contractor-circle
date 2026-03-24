import { trpc } from "@/lib/trpc";
import { useCallback, useState } from "react";

/**
 * Detect if we're running inside an in-app browser (Instagram, Facebook, TikTok, etc.)
 * These browsers block window.open() so we must use window.location.href instead.
 */
function isInAppBrowser(): boolean {
  const ua = navigator.userAgent || navigator.vendor || "";
  return /FBAN|FBAV|Instagram|Line\/|Snapchat|Twitter|TikTok|BytedanceWebview|Musical_ly|LinkedInApp/i.test(ua);
}

/**
 * Detect if we're on a mobile device.
 */
function isMobile(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Hook to handle Stripe checkout for The Contractor Circle subscription.
 * Uses window.location.href for in-app browsers and mobile (where window.open is blocked).
 * Uses window.open for desktop browsers.
 */
export function useCircleCheckout() {
  const [isLoading, setIsLoading] = useState(false);
  const mutation = trpc.stripe.createCircleCheckout.useMutation();

  const startCheckout = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const result = await mutation.mutateAsync();

      // In-app browsers (Instagram, Facebook, TikTok) and mobile browsers
      // block window.open(). Redirect in the same window instead.
      if (isInAppBrowser() || isMobile()) {
        window.location.href = result.checkoutUrl;
      } else {
        // Desktop: try window.open, fall back to redirect if blocked
        const newWindow = window.open(result.checkoutUrl, "_blank");
        if (!newWindow || newWindow.closed) {
          window.location.href = result.checkoutUrl;
        }
      }
    } catch (error) {
      console.error("[Checkout] Failed to create checkout session:", error);
      alert("Something went wrong starting checkout. Please try again.");
      setIsLoading(false);
    }
  }, [isLoading, mutation]);

  return { startCheckout, isLoading };
}
