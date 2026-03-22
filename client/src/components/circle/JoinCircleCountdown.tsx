import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";

/**
 * Join the Circle Countdown Timer
 * Shows urgency for founding member pricing deadline.
 * Set DEADLINE to the date when founding pricing expires.
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

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, isExpired: false };
}

function CountdownCell({ value, label }: { value: number; label: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center"
    >
      <div className="bg-gradient-to-br from-ember/20 to-orange-500/10 border border-ember/30 rounded-xl px-3 sm:px-4 py-2 sm:py-3 min-w-[60px] sm:min-w-[70px]">
        <div className="text-2xl sm:text-3xl font-black text-ember tabular-nums">
          {String(value).padStart(2, "0")}
        </div>
      </div>
      <span className="text-[10px] sm:text-xs font-semibold text-cream/60 mt-2 uppercase tracking-wider">
        {label}
      </span>
    </motion.div>
  );
}

export function JoinCircleCountdown() {
  const [time, setTime] = useState<TimeRemaining>(calculateTimeRemaining());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => {
      setTime(calculateTimeRemaining());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!mounted) return null;

  if (time.isExpired) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-6 sm:p-8 text-center"
      >
        <h3 className="text-lg sm:text-xl font-black text-cream mb-2">
          Founding Pricing Has Ended
        </h3>
        <p className="text-cream/60 text-sm">
          Thank you for your interest. Regular pricing is now in effect.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative bg-gradient-to-br from-ember/15 via-orange-500/5 to-slate-900/50 border border-ember/30 rounded-2xl p-6 sm:p-8 overflow-hidden"
    >
      {/* Animated background glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-ember/20 to-transparent rounded-full blur-3xl -z-10 pointer-events-none" />

      {/* Header */}
      <div className="flex items-center gap-3 mb-6 justify-center sm:justify-start">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-10 h-10 rounded-full bg-ember/20 flex items-center justify-center"
        >
          <Zap size={20} className="text-ember" />
        </motion.div>
        <div>
          <h3 className="text-lg sm:text-xl font-black text-cream">
            Founding Pricing Expires In
          </h3>
          <p className="text-xs sm:text-sm text-cream/60 mt-0.5">
            Lock in $500/month before regular pricing takes effect
          </p>
        </div>
      </div>

      {/* Countdown Cells */}
      <div className="flex items-center justify-center sm:justify-start gap-2 sm:gap-3 flex-wrap">
        <CountdownCell value={time.days} label="Days" />
        <span className="text-2xl sm:text-3xl font-black text-cream/30 mb-6">:</span>
        <CountdownCell value={time.hours} label="Hours" />
        <span className="text-2xl sm:text-3xl font-black text-cream/30 mb-6">:</span>
        <CountdownCell value={time.minutes} label="Minutes" />
        <span className="text-2xl sm:text-3xl font-black text-cream/30 mb-6">:</span>
        <CountdownCell value={time.seconds} label="Seconds" />
      </div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-6 text-center sm:text-left"
      >
        <a
          href="#pricing"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-ember to-orange-500 hover:from-ember/90 hover:to-orange-500/90 text-white font-bold text-sm transition-all duration-300 hover:scale-105"
        >
          <Zap size={16} />
          Claim Your Founding Spot Now
        </a>
      </motion.div>
    </motion.div>
  );
}
