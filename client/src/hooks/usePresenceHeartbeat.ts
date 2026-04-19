/**
 * usePresenceHeartbeat — sends a heartbeat to the server every 30s
 * with the user's current page path for online presence tracking.
 * Also flags page changes so the server can log navigation events.
 */
import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

const HEARTBEAT_INTERVAL = 30_000; // 30 seconds

export function usePresenceHeartbeat() {
  const { user } = useAuth();
  const [location] = useLocation();
  const heartbeatMutation = trpc.presence.heartbeat.useMutation();
  const locationRef = useRef(location);
  const prevLocationRef = useRef<string | null>(null);

  // Track page changes
  const isPageChange = locationRef.current !== prevLocationRef.current;
  if (isPageChange) {
    prevLocationRef.current = locationRef.current;
  }
  locationRef.current = location;

  useEffect(() => {
    if (!user) return;

    // Send initial heartbeat immediately (always a page change on mount)
    heartbeatMutation.mutate({ currentPage: locationRef.current, isPageChange: true });

    // Then every 30 seconds
    const interval = setInterval(() => {
      const changed = locationRef.current !== prevLocationRef.current;
      if (changed) {
        prevLocationRef.current = locationRef.current;
      }
      heartbeatMutation.mutate({
        currentPage: locationRef.current,
        isPageChange: changed,
      });
    }, HEARTBEAT_INTERVAL);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!user]);

  // Send an immediate heartbeat on location change
  useEffect(() => {
    if (!user) return;
    heartbeatMutation.mutate({ currentPage: location, isPageChange: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);
}
