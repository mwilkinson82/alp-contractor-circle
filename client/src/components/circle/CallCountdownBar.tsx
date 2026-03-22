/**
 * CallCountdownBar — sticky top announcement bar counting down to the next
 * bi-weekly Contractor Circle call. Anchored on March 29, 2025 at 5 PM ET,
 * then every 14 days. Dismissible per session.
 */
import { useState, useEffect } from "react";
import { X, Calendar } from "lucide-react";

// Anchor: first call is Sunday March 29, 2025 at 5 PM ET (UTC-4 in EDT = 21:00 UTC)
const FIRST_CALL_UTC = Date.UTC(2025, 2, 29, 21, 0, 0); // March 29, 2025 21:00 UTC
const CYCLE_MS = 14 * 24 * 60 * 60 * 1000; // 14 days in ms

/** Returns the next call Date (UTC) */
function getNextCallDate(): Date {
  const now = Date.now();
  const msSinceAnchor = now - FIRST_CALL_UTC;
  if (msSinceAnchor < 0) return new Date(FIRST_CALL_UTC);
  const cyclesPassed = Math.floor(msSinceAnchor / CYCLE_MS);
  const nextCallMs = FIRST_CALL_UTC + (cyclesPassed + 1) * CYCLE_MS;
  return new Date(nextCallMs);
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

function calcTimeLeft(target: Date): TimeLeft {
  const total = target.getTime() - Date.now();
  if (total <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  const hours = Math.floor((total % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((total % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((total % (1000 * 60)) / 1000);
  return { days, hours, minutes, seconds, total };
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center min-w-[2.5rem]">
      <span
        className="font-bold text-cream tabular-nums leading-none"
        style={{ fontFamily: "'Sora', sans-serif", fontSize: "clamp(0.9rem, 2.5vw, 1.1rem)" }}
      >
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[9px] text-cream/40 uppercase tracking-widest mt-0.5" style={{ fontFamily: "'Sora', sans-serif" }}>
        {label}
      </span>
    </div>
  );
}

function Colon() {
  return <span className="text-ember/60 font-bold text-base mb-2 select-none">:</span>;
}

export function CallCountdownBar() {
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem("countdown_dismissed") === "1"; } catch { return false; }
  });
  const [nextCall] = useState(getNextCallDate);
  const [timeLeft, setTimeLeft] = useState(() => calcTimeLeft(nextCall));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(calcTimeLeft(nextCall));
    }, 1000);
    return () => clearInterval(interval);
  }, [nextCall]);

  const dismiss = () => {
    setDismissed(true);
    try { sessionStorage.setItem("countdown_dismissed", "1"); } catch {}
  };

  if (dismissed) return null;

  const callLabel = nextCall.toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", timeZone: "UTC",
  });

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-3 px-4 sm:px-6 py-2.5"
      style={{
        background: "linear-gradient(90deg, oklch(0.12 0.02 260 / 0.97), oklch(0.14 0.02 260 / 0.97))",
        borderBottom: "1px solid oklch(0.72 0.12 55 / 0.18)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      {/* Left: label */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="relative flex items-center justify-center w-2.5 h-2.5">
          <span
            className="absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ background: "oklch(0.60 0.22 25)", animation: "live-pulse 1.8s ease-out infinite" }}
          />
          <span className="relative inline-flex rounded-full w-1.5 h-1.5" style={{ background: "oklch(0.60 0.22 25)" }} />
        </span>
        <span
          className="text-xs font-semibold text-ember hidden sm:inline"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          NEXT CALL
        </span>
        <span
          className="text-xs text-cream/50 hidden md:inline"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          {callLabel} · 5 PM ET
        </span>
      </div>

      {/* Center: countdown */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <Calendar className="w-3.5 h-3.5 text-ember/60 hidden sm:block" />
        <div className="flex items-end gap-1">
          <TimeUnit value={timeLeft.days} label="days" />
          <Colon />
          <TimeUnit value={timeLeft.hours} label="hrs" />
          <Colon />
          <TimeUnit value={timeLeft.minutes} label="min" />
          <Colon />
          <TimeUnit value={timeLeft.seconds} label="sec" />
        </div>
      </div>

      {/* Right: CTA + dismiss */}
      <div className="flex items-center gap-2 shrink-0">
        <a
          href="#pricing"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-midnight transition-all duration-200 hover:opacity-90"
          style={{ background: "oklch(0.72 0.12 55)", fontFamily: "'Sora', sans-serif" }}
        >
          Claim Spot
        </a>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="p-1 rounded hover:bg-white/10 transition-colors"
        >
          <X className="w-3.5 h-3.5 text-cream/40 hover:text-cream/70" />
        </button>
      </div>
    </div>
  );
}
