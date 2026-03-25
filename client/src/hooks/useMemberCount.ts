/**
 * useMemberCount — shared hook for dynamic founding member count.
 *
 * Queries the tRPC circle.memberCount endpoint which reads from Supabase.
 * All three landing page locations (hero badge, stats section, results tab)
 * use this hook so they stay in sync automatically.
 *
 * Caches for 60 seconds to avoid excessive API calls on page load.
 */
import { trpc } from "@/lib/trpc";

const TOTAL_FOUNDING_SPOTS = 50;

export function useMemberCount() {
  const { data, isLoading } = trpc.circle.memberCount.useQuery(undefined, {
    staleTime: 60_000, // Cache for 60 seconds
    refetchOnWindowFocus: false,
  });

  const count = data?.count ?? 9; // Fallback while loading
  const total = data?.total ?? TOTAL_FOUNDING_SPOTS;
  const remaining = total - count;

  return {
    count,
    total,
    remaining,
    isLoading,
  };
}
