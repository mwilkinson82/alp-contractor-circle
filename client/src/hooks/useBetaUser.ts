/**
 * useBetaUser — Hook to detect and manage beta user session.
 * Returns null if no beta session, or { id, email, name, companyName, isBeta: true } if authenticated.
 */
import { useEffect, useState } from "react";

export interface BetaUser {
  id: number;
  email: string;
  name: string;
  companyName: string | null;
  isBeta: true;
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
          setBetaUser(data);
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
    } catch (err) {
      console.error("[useBetaUser] Logout error:", err);
    }
  };

  return { betaUser, loading, logout };
}
