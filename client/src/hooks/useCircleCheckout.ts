import { trpc } from "@/lib/trpc";
import { useCallback, useState } from "react";

/**
 * Hook to handle Stripe checkout for The Contracting Circle subscription.
 * Opens checkout in a new tab and shows loading state.
 */
export function useCircleCheckout() {
  const [isLoading, setIsLoading] = useState(false);
  const mutation = trpc.stripe.createCircleCheckout.useMutation();

  const startCheckout = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const result = await mutation.mutateAsync();
      // Open Stripe Checkout in a new tab
      window.open(result.checkoutUrl, "_blank");
    } catch (error) {
      console.error("[Checkout] Failed to create checkout session:", error);
      alert("Something went wrong starting checkout. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, mutation]);

  return { startCheckout, isLoading };
}
