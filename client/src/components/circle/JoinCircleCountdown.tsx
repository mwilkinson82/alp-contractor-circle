import { useEffect, useState } from "react";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Clock } from "lucide-react";

/**
 * Founding Pricing Countdown — Premium urgency element
 * Sits directly above the pricing section as a centered, compact banner
 * with live countdown and clear visual presence.
 */

// Founding pricing deadline: April 15, 2026 at 11:59 PM ET
const DEADLINE = new Date("2026-04-15T23:59:59-04:00");

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

function calculateTimeRemaining(): TimeRemaining {
  const now = new Date();
  const diff = DEADLINE.getTime() - now.getTime();

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
    isExpired: false,
  };
}

const easeOutCubic = [0.22, 1, 0.36, 1] as [number, number, number, number];

export function JoinCircleCountdown() {
  const [time, setTime] = useState<TimeRemaining>(calculateTimeRemaining());
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => {
      setTime(calculateTimeRemaining());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!mounted) return null;
  if (time.isExpired) return null;

  const units = [
    { value: time.days, label: "Days" },
    { value: time.hours, label: "Hrs" },
    { value: time.minutes, label: "Min" },
    { value: time.seconds, label: "Sec" },
  ];

  return (
    <div ref={ref} className="relative z-10 px-4 sm:px-6 py-10 sm:py-14">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, ease: easeOutCubic }}
        className="max-w-xl mx-auto text-center"
      >
        {/* Urgency badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.6, ease: easeOutCubic, delay: 0.1 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-ember/10 border border-ember/20 mb-6"
        >
          {/* Pulsing dot */}
          <span className="relative flex items-center justify-center w-2 h-2">
            <span
              className="absolute inline-flex h-full w-full rounded-full opacity-60"
              style={{ background: "oklch(0.72 0.12 55)", animation: "live-pulse 1.8s ease-out infinite" }}
            />
            <span className="relative inline-flex rounded-full w-1.5 h-1.5" style={{ background: "oklch(0.72 0.12 55)" }} />
          </span>
          <span
            className="text-[11px] sm:text-xs font-semibold uppercase tracking-widest text-ember"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Founding pricing ends April 15
          </span>
        </motion.div>

        {/* Countdown cells */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: easeOutCubic, delay: 0.2 }}
          className="flex items-center justify-center gap-3 sm:gap-4"
        >
          {units.map((unit, i) => (
            <div key={unit.label} className="flex items-center gap-3 sm:gap-4">
              <div className="flex flex-col items-center">
                <div
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg flex items-center justify-center border border-ember/15 bg-ember/[0.05]"
                  style={{ boxShadow: "0 0 20px oklch(0.72 0.12 55 / 0.05)" }}
                >
                  <span
                    className="tabular-nums text-2xl sm:text-3xl font-black text-cream"
                    style={{ fontFamily: "'Sora', monospace" }}
                  >
                    {String(unit.value).padStart(2, "0")}
                  </span>
                </div>
                <span
                  className="text-[9px] sm:text-[10px] text-cream/40 uppercase font-medium tracking-wider mt-1.5"
                  style={{ fontFamily: "'Sora', sans-serif" }}
                >
                  {unit.label}
                </span>
              </div>
              {i < units.length - 1 && (
                <span className="text-ember/40 text-lg font-bold -mt-4">:</span>
              )}
            </div>
          ))}
        </motion.div>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-xs sm:text-sm text-cream/30 mt-5"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Lock in $497/mo forever — price increases after deadline
        </motion.p>
      </motion.div>
    </div>
  );
}
