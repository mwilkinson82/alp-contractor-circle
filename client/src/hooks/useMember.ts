/**
 * Hook for Discord member authentication state.
 * Separate from useAuth (Manus OAuth) — this is for Contracting Circle members.
 */
import { trpc } from "@/lib/trpc";
import { useCallback } from "react";

export function useMember() {
  const meQuery = trpc.member.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logout = useCallback(async () => {
    try {
      await fetch("/api/discord/logout", { method: "POST", credentials: "include" });
    } catch {
      // ignore
    }
    // Force refetch to clear state
    meQuery.refetch();
    window.location.href = "/circle";
  }, [meQuery]);

  const getLoginUrl = useCallback((returnPath: string = "/portal") => {
    const origin = window.location.origin;
    return `/api/discord/login?origin=${encodeURIComponent(origin)}&returnPath=${encodeURIComponent(returnPath)}`;
  }, []);

  return {
    member: meQuery.data ?? null,
    loading: meQuery.isLoading,
    error: meQuery.error,
    isAuthenticated: Boolean(meQuery.data),
    logout,
    getLoginUrl,
    refresh: () => meQuery.refetch(),
  };
}
