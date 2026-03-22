import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { TrendingUp, ArrowRight } from "lucide-react";

const transformations = [
  {
    company: "CNY Group",
    before: 600000,
    after: 20000000,
    multiplier: "33×",
    period: "18 Months",
    accent: "ember" as const,
  },
  {
    company: "Trojan Roofing",
    before: 300000,
    after: 10000000,
    multiplier: "33×",
    period: "First Year",
    accent: "blue" as const,
  },
  {
    company: "Sage Construction",
    before: 0,
    after: 2000000,
    multiplier: "∞",
    period: "1 Year",
    accent: "green" as const,
  },
  {
    company: "Davis Contracting",
    before: 1000000,
    after: 4000000,
    multiplier: "4×",
    period: "6 Months",
    accent: "ember" as const,
  },
  {
    company: "ARC Construction Group",
    before: 0,
    after: 2000000,
    multiplier: "∞",
    period: "1 Year",
    accent: "blue" as const,
  },
];

function formatRevenue(value: number): string {
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return `$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return "$0";
}

/** Counts from `from` to `to` over `duration` ms when `active` becomes true */
function useCountUp(to: number, duration: number, active: boolean, from = 0): number {
  const [val, setVal] = useState(from);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (!active) { setVal(from); return; }
    startRef.current = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - startRef.current) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(from + (to - from) * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, to, duration, from]);

  return val;
}

const ACCENT = {
  ember: {
    color: "oklch(0.72 0.12 55)",
    glow: "oklch(0.72 0.12 55 / 0.35)",
    bg: "oklch(0.72 0.12 55 / 0.07)",
    border: "oklch(0.72 0.12 55 / 0.18)",
    bar: "linear-gradient(90deg, oklch(0.72 0.12 55 / 0.2), oklch(0.72 0.12 55 / 0.85))",
    text: "text-ember",
  },
  blue: {
    color: "oklch(0.65 0.12 240)",
    glow: "oklch(0.65 0.12 240 / 0.35)",
    bg: "oklch(0.65 0.12 240 / 0.07)",
    border: "oklch(0.65 0.12 240 / 0.18)",
    bar: "linear-gradient(90deg, oklch(0.65 0.12 240 / 0.2), oklch(0.65 0.12 240 / 0.85))",
    text: "text-blue-accent",
  },
  green: {
    color: "oklch(0.72 0.1 145)",
    glow: "oklch(0.72 0.1 145 / 0.35)",
    bg: "oklch(0.72 0.1 145 / 0.07)",
    border: "oklch(0.72 0.1 145 / 0.18)",
    bar: "linear-gradient(90deg, oklch(0.72 0.1 145 / 0.2), oklch(0.72 0.1 145 / 0.85))",
    text: "text-green-400",
  },
};

function TransformationRow({ t, index }: { t: (typeof transformations)[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  const a = ACCENT[t.accent];

  // Dynamic max: use the highest 'after' value across all transformations
  const maxVal = 20_000_000;
  const beforePct = t.before === 0 ? 0 : Math.max((t.before / t.after) * 100, 3);
  const afterPct = 100; // Always fill to 100% for visual impact

  // Count up the "after" revenue number
  const countedAfter = useCountUp(t.after, 1800, isInView, t.before);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 36 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1], delay: index * 0.12 }}
    >
      <div
        className="rounded-2xl p-6 sm:p-8 border relative overflow-hidden"
        style={{ borderColor: a.border, background: `linear-gradient(135deg, ${a.bg}, transparent)` }}
      >
        {/* Corner glow */}
        <div
          className="absolute top-0 right-0 w-48 h-48 pointer-events-none"
          style={{ background: `radial-gradient(circle at top right, ${a.glow}, transparent 70%)`, opacity: 0.4 }}
        />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 relative gap-3 sm:gap-0">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center border"
              style={{ borderColor: a.border, background: a.bg }}
            >
              <TrendingUp size={16} style={{ color: a.color }} />
            </div>
            <div>
              <p className="text-base sm:text-lg font-bold text-cream leading-tight" style={{ fontFamily: "'Sora', sans-serif" }}>
                {t.company}
              </p>
              <p className="text-[10px] text-cream/35 uppercase tracking-widest mt-0.5" style={{ fontFamily: "'Sora', sans-serif" }}>
                {t.period} with ALP
              </p>
            </div>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.35 + index * 0.12 }}
            className="px-4 py-2 rounded-full border self-start sm:self-auto"
            style={{ borderColor: a.border, background: a.bg }}
          >
            <span className="text-lg sm:text-2xl font-black" style={{ color: a.color, fontFamily: "'Sora', sans-serif" }}>
              {t.multiplier}
            </span>
          </motion.div>
        </div>

        {/* Before bar */}
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-cream/30" style={{ fontFamily: "'Sora', sans-serif" }}>
              Before
            </span>
            <span className="text-sm font-semibold text-cream/35 line-through" style={{ fontFamily: "'Sora', sans-serif" }}>
              {t.before === 0 ? "$0" : formatRevenue(t.before)}
            </span>
          </div>
          <div className="h-2 sm:h-2.5 rounded-full overflow-hidden" style={{ background: "oklch(0.14 0.02 260)" }}>
            <motion.div
              className="h-full rounded-full"
              initial={{ width: 0 }}
              animate={isInView ? { width: `${beforePct}%` } : {}}
              transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1], delay: 0.2 + index * 0.12 }}
              style={{ background: "oklch(0.28 0.02 260)" }}
            />
          </div>
        </div>

        {/* Arrow divider */}
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.4, delay: 0.45 + index * 0.12 }}
          className="flex items-center gap-2 my-2.5"
        >
          <ArrowRight size={13} style={{ color: a.color }} />
          <span
            className="text-[10px] font-bold tracking-widest uppercase"
            style={{ color: a.color, fontFamily: "'Sora', sans-serif" }}
          >
            After ALP
          </span>
        </motion.div>

        {/* After bar + live counter */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span
              className="text-[10px] font-semibold tracking-[0.15em] uppercase"
              style={{ color: a.color, fontFamily: "'Sora', sans-serif" }}
            >
              After
            </span>
            {/* Live counting number */}
            <span
              className="text-xl sm:text-3xl font-black tabular-nums"
              style={{
                color: a.color,
                fontFamily: "'Sora', sans-serif",
                textShadow: `0 0 20px ${a.glow}`,
                letterSpacing: "-0.03em",
              }}
            >
              {formatRevenue(countedAfter)}
            </span>
          </div>

          {/* Animated bar */}
          <div className="h-4 sm:h-5 rounded-full overflow-hidden relative" style={{ background: "oklch(0.14 0.02 260)" }}>
            <motion.div
              className="h-full rounded-full relative"
              initial={{ width: 0 }}
              animate={isInView ? { width: `${afterPct}%` } : {}}
              transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1], delay: 0.35 + index * 0.12 }}
              style={{ background: a.bar }}
            >
              {/* Shimmer sweep */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `linear-gradient(90deg, transparent 0%, ${a.color}50 50%, transparent 100%)`,
                  backgroundSize: "200% 100%",
                }}
                animate={isInView ? { backgroundPosition: ["200% 0%", "-200% 0%"] } : {}}
                transition={{ duration: 2.5, repeat: Infinity, ease: "linear", delay: 1.8 + index * 0.12 }}
              />
            </motion.div>

            {/* Glowing tip */}
            <motion.div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full"
              initial={{ left: "0%" }}
              animate={isInView ? { left: `calc(${afterPct}% - 8px)` } : {}}
              transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1], delay: 0.35 + index * 0.12 }}
              style={{
                background: a.color,
                boxShadow: `0 0 0 3px oklch(0.1 0.02 260), 0 0 14px ${a.glow}`,
                zIndex: 2,
              }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function RevenueImpact() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-60px" });

  return (
    <section className="relative z-10 py-14 sm:py-20 lg:py-28 px-4 sm:px-6">
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 50% 30%, oklch(0.72 0.12 55 / 0.04), transparent 60%)",
        }}
      />

      <div ref={sectionRef} className="max-w-4xl mx-auto relative">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-12 sm:mb-16"
        >
          <motion.p
            initial={{ opacity: 0, letterSpacing: "0.5em" }}
            animate={isInView ? { opacity: 1, letterSpacing: "0.2em" } : {}}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="text-xs font-semibold uppercase text-ember mb-4"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Verified Member Results
          </motion.p>

          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-cream leading-tight mb-4"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Before ALP vs.{" "}
            <span className="text-ember">After ALP</span>
          </h2>

          <p
            className="text-base sm:text-lg text-cream/50 max-w-2xl mx-auto"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Real contractors. Real revenue. Documented results from operators who committed to the process.
          </p>

          <motion.div
            initial={{ scaleX: 0 }}
            animate={isInView ? { scaleX: 1 } : {}}
            transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="w-16 h-[2px] mx-auto mt-6"
            style={{
              background: "linear-gradient(90deg, transparent, oklch(0.72 0.12 55), transparent)",
              transformOrigin: "center",
            }}
          />
        </motion.div>

        {/* Transformation rows */}
        <div className="space-y-6">
          {transformations.map((t, i) => (
            <TransformationRow key={t.company} t={t} index={i} />
          ))}
        </div>

        {/* Plus dozens more */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-center mt-8 mb-2"
        >
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full border" style={{ borderColor: 'oklch(0.72 0.12 55 / 0.15)', background: 'oklch(0.72 0.12 55 / 0.05)' }}>
            <span className="text-sm font-semibold text-ember tracking-wide" style={{ fontFamily: "'Sora', sans-serif" }}>
              + Dozens More Contractors Scaling With ALP
            </span>
          </div>
        </motion.div>

        {/* Summary stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.7 }}
          className="grid grid-cols-3 gap-4 mt-10 pt-8 border-t"
          style={{ borderColor: "oklch(0.72 0.12 55 / 0.12)" }}
        >
          {[
            { label: "Total Revenue Generated", value: "$100M+" },
            { label: "Avg Growth Multiple", value: "33×" },
            { label: "Fastest Result", value: "1 Month" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p
                className="text-2xl sm:text-3xl font-black text-ember"
                style={{ fontFamily: "'Sora', sans-serif", letterSpacing: "-0.03em" }}
              >
                {stat.value}
              </p>
              <p
                className="text-[10px] text-cream/30 uppercase tracking-wider mt-1"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                {stat.label}
              </p>
            </div>
          ))}
        </motion.div>

        {/* Disclaimer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="text-center text-xs text-cream/20 mt-6 max-w-lg mx-auto"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Results vary. These are real members who committed to the process, showed up consistently, and executed on what they learned.
        </motion.p>
      </div>
    </section>
  );
}
