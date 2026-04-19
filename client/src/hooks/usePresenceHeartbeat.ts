/**
 * usePresenceHeartbeat — sends a heartbeat to the server every 30s
 * with the user's current page path for online presence tracking.
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
  locationRef.current = location;

  useEffect(() => {
    if (!user) return;

    // Send initial heartbeat immediately
    heartbeatMutation.mutate({ currentPage: locationRef.current });

    // Then every 30 seconds
    const interval = setInterval(() => {
      heartbeatMutation.mutate({ currentPage: locationRef.current });
    }, HEARTBEAT_INTERVAL);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!user]);
}
