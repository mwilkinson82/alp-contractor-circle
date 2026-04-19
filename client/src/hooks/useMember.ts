/**
 * Hook for Discord member authentication state.
 * Separate from useAuth (Manus OAuth) — this is for Contractor Circle members.
 */
import { trpc } from "@/lib/trpc";
import { useCallback } from "react";

export function useMember() {
  const meQuery = trpc.member.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logout = useCallback(async () => {
    // Clear BOTH session types — Discord member cookie AND ConstructLine beta cookie.
    // This ensures that no matter which account type is active, Sign Out is a full wipe.
    try {
      await Promise.allSettled([
        fetch("/api/discord/logout", { method: "POST", credentials: "include" }),
        fetch("/api/beta/logout", { method: "POST", credentials: "include" }),
      ]);
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

  const subscriptionStatus = meQuery.data?.subscriptionStatus;
  const isSubscribed = subscriptionStatus === 'active' || subscriptionStatus === 'trialing';

  return {
    member: meQuery.data ?? null,
    loading: meQuery.isLoading,
    error: meQuery.error,
    isAuthenticated: Boolean(meQuery.data),
    isSubscribed,
    logout,
    getLoginUrl,
    refresh: () => meQuery.refetch(),
  };
}
