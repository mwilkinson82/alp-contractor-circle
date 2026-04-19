/**
 * useActivityLog — provides a fire-and-forget logActivity function
 * that records user actions to the activity feed for admin visibility.
 */
import { useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

export function useActivityLog() {
  const { user } = useAuth();
  const logMutation = trpc.presence.logActivity.useMutation();
  // Debounce page_visit logs so we don't spam on rapid navigation
  const lastPageRef = useRef<string>("");

  const logActivity = useCallback(
    (action: string, description: string, refPath?: string) => {
      if (!user) return;
      // Debounce duplicate page_visit logs
      if (action === "page_visit") {
        if (lastPageRef.current === refPath) return;
        lastPageRef.current = refPath || "";
      }
      logMutation.mutate({ action, description, refPath });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [!!user]
  );

  return { logActivity };
}
