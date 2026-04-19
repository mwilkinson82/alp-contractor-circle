/**
 * useBetaUser — Hook to detect and manage ConstructLine free-access user session.
 * Returns null if no session, or { id, email, name, companyName, isConstructLineUser: true } if authenticated.
 */
import { useEffect, useState } from "react";

export interface BetaUser {
  id: number;
  email: string;
  name: string;
  companyName: string | null;
  /** Whether the user has connected their Discord account */
  discordConnected: boolean;
  /** Discord username if connected */
  discordUsername: string | null;
  /** @deprecated kept for backward compat — prefer isConstructLineUser */
  isBeta?: true;
  isConstructLineUser: true;
}

export function useBetaUser() {
  const [betaUser, setBetaUser] = useState<BetaUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkBetaSession = async () => {
      try {
        const res = await fetch("/api/beta/me");
        if (res.ok) {
          const data = await res.json();
          // Guard: server returns null (200 with JSON null) when no valid session.
          // Spreading null gives a truthy object { isBeta: true } — must check data.id.
          if (data && data.id) {
            setBetaUser({
              ...data,
              discordConnected: !!data.discordConnected,
              discordUsername: data.discordUsername || null,
              isBeta: true,
              isConstructLineUser: true,
            });
          } else {
            setBetaUser(null);
          }
        } else {
          setBetaUser(null);
        }
      } catch (err) {
        console.error("[useBetaUser] Error checking session:", err);
        setBetaUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkBetaSession();
  }, []);

  const logout = async () => {
    try {
      await fetch("/api/beta/logout", { method: "POST" });
      setBetaUser(null);
      // Hard redirect so the Discord login page doesn't see a stale beta session
      window.location.href = "/constructline";
    } catch (err) {
      console.error("[useBetaUser] Logout error:", err);
    }
  };

  return { betaUser, loading, logout };
}
