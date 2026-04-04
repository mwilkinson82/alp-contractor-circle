/**
 * CallCountdownBar — informational schedule bar, styled like an airport/train
 * departures board. Shows the next bi-weekly Contractor Circle call date and
 * a live countdown. No sales language. Dismissible per session.
 *
 * Anchor: Sunday March 30, 2025 at 5 PM ET (21:00 UTC, EDT = UTC-4)
 */
import { useState, useEffect } from "react";
import { X } from "lucide-react";

const FIRST_CALL_UTC = Date.UTC(2025, 2, 30, 21, 0, 0); // March 30, 2025 21:00 UTC (Sunday)
const CYCLE_MS = 14 * 24 * 60 * 60 * 1000;

function getNextCallDate(): Date {
  const now = Date.now();
  const msSinceAnchor = now - FIRST_CALL_UTC;
  if (msSinceAnchor < 0) return new Date(FIRST_CALL_UTC);
  const cyclesPassed = Math.floor(msSinceAnchor / CYCLE_MS);
  return new Date(FIRST_CALL_UTC + (cyclesPassed + 1) * CYCLE_MS);
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
  return {
    days: Math.floor(total / 86400000),
    hours: Math.floor((total % 86400000) / 3600000),
    minutes: Math.floor((total % 3600000) / 60000),
    seconds: Math.floor((total % 60000) / 1000),
    total,
  };
}

/** A single time unit cell — compact monospaced number + tiny label */
function Cell({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center" style={{ minWidth: "2rem" }}>
      <span
        className="tabular-nums font-bold leading-none text-cream"
        style={{ fontFamily: "'Sora', monospace", fontSize: "clamp(0.8rem, 2.2vw, 0.95rem)" }}
      >
        {String(value).padStart(2, "0")}
      </span>
      <span
        className="uppercase tracking-widest text-cream/35 mt-0.5"
        style={{ fontFamily: "'Sora', sans-serif", fontSize: "0.55rem" }}
      >
        {label}
      </span>
    </div>
  );
}

function Sep() {
  return (
    <span className="text-cream/25 font-light select-none pb-1.5" style={{ fontSize: "0.85rem" }}>
      :
    </span>
  );
}

export function CallCountdownBar() {
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem("countdown_dismissed") === "1"; } catch { return false; }
  });
  const [nextCall] = useState(getNextCallDate);
  const [timeLeft, setTimeLeft] = useState(() => calcTimeLeft(nextCall));

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(calcTimeLeft(nextCall)), 1000);
    return () => clearInterval(id);
  }, [nextCall]);

  const dismiss = () => {
    setDismissed(true);
    try { sessionStorage.setItem("countdown_dismissed", "1"); } catch {}
  };

  if (dismissed) return null;

  // Format: "Sun, Mar 29" in UTC so it matches the anchor date regardless of viewer timezone
  const dateLabel = nextCall.toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", timeZone: "UTC",
  });

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: "oklch(0.11 0.025 260 / 0.96)",
        borderBottom: "1px solid oklch(0.72 0.12 55 / 0.14)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
      }}
    >
      {/* Single row — three columns: live dot + label | countdown | date + dismiss */}
      <div className="flex items-center justify-between gap-2 px-3 sm:px-5 py-2">

        {/* LEFT — live dot + always-visible label */}
        <div className="flex items-center gap-2 shrink-0 min-w-0">
          {/* Pulsing live dot */}
          <span className="relative flex items-center justify-center w-2.5 h-2.5 shrink-0">
            <span
              className="absolute inline-flex h-full w-full rounded-full opacity-60"
              style={{ background: "oklch(0.60 0.22 25)", animation: "live-pulse 1.8s ease-out infinite" }}
            />
            <span className="relative inline-flex rounded-full w-1.5 h-1.5" style={{ background: "oklch(0.60 0.22 25)" }} />
          </span>

          {/* Label — always visible, wraps gracefully */}
          <div className="flex flex-col leading-tight">
            <span
              className="font-semibold text-cream/90 uppercase tracking-widest"
              style={{ fontFamily: "'Sora', sans-serif", fontSize: "0.6rem" }}
            >
              Next Contractor Circle Call
            </span>
            <span
              className="text-ember/80 font-medium"
              style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.7rem" }}
            >
              {dateLabel} · 5 PM ET
            </span>
          </div>
        </div>

        {/* CENTER — countdown */}
        <div className="flex items-end gap-1 shrink-0">
          <Cell value={timeLeft.days} label="days" />
          <Sep />
          <Cell value={timeLeft.hours} label="hrs" />
          <Sep />
          <Cell value={timeLeft.minutes} label="min" />
          <Sep />
          <Cell value={timeLeft.seconds} label="sec" />
        </div>

        {/* RIGHT — dismiss only */}
        <div className="shrink-0">
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="p-1.5 rounded hover:bg-white/8 transition-colors"
          >
            <X className="w-3 h-3 text-cream/30 hover:text-cream/60" />
          </button>
        </div>

      </div>
    </div>
  );
}
