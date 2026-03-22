import { motion, useScroll, useTransform, useSpring, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { ArrowRight, TrendingUp } from "lucide-react";

const transformations = [
  {
    name: "Brian Betancourt",
    before: 600000,
    beforeLabel: "$600K",
    after: 20000000,
    afterLabel: "$20M",
    multiplier: "33×",
    period: "18 Months",
    accent: "ember" as const,
  },
  {
    name: "Morgan Tyler",
    before: 300000,
    beforeLabel: "$300K",
    after: 10000000,
    afterLabel: "$10M",
    multiplier: "33×",
    period: "First Year",
    accent: "blue" as const,
  },
  {
    name: "Ronnie Silva",
    before: 0,
    beforeLabel: "$0",
    after: 2000000,
    afterLabel: "$2M",
    multiplier: "∞",
    period: "2nd Month",
    accent: "ember" as const,
  },
];

/* Animated counter that counts up when visible */
function AnimatedNumber({ value, prefix = "$", suffix = "", isInView }: { value: string; prefix?: string; suffix?: string; isInView: boolean }) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={isInView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
    >
      {prefix}{value}{suffix}
    </motion.span>
  );
}

function TransformationRow({ t, index }: { t: (typeof transformations)[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  const isEmber = t.accent === "ember";
  const accentClass = isEmber ? "text-ember" : "text-blue-accent";
  const accentColor = isEmber ? "oklch(0.72 0.12 55)" : "oklch(0.55 0.1 240)";
  const accentBg = isEmber ? "oklch(0.72 0.12 55 / 0.08)" : "oklch(0.55 0.1 240 / 0.08)";
  const accentBorder = isEmber ? "oklch(0.72 0.12 55 / 0.2)" : "oklch(0.55 0.1 240 / 0.2)";
  const barGradient = isEmber
    ? "linear-gradient(90deg, oklch(0.72 0.12 55 / 0.15), oklch(0.72 0.12 55 / 0.6))"
    : "linear-gradient(90deg, oklch(0.55 0.1 240 / 0.15), oklch(0.55 0.1 240 / 0.6))";

  /* Calculate bar widths proportionally */
  const maxVal = 20000000;
  const beforeWidth = Math.max((t.before / maxVal) * 100, 3);
  const afterWidth = Math.max((t.after / maxVal) * 100, 12);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: index * 0.15 }}
      className="relative"
    >
      <div
        className="rounded-2xl p-6 sm:p-8 border overflow-hidden"
        style={{ borderColor: accentBorder, background: `linear-gradient(135deg, ${accentBg}, transparent)` }}
      >
        {/* Header: name + period + multiplier */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center border"
              style={{ borderColor: accentBorder, background: accentBg }}
            >
              <TrendingUp size={16} className={accentClass} />
            </div>
            <div>
              <p className="text-base sm:text-lg font-bold text-cream" style={{ fontFamily: "'Sora', sans-serif" }}>
                {t.name}
              </p>
              <p className="text-xs text-cream/40 uppercase tracking-wider" style={{ fontFamily: "'Sora', sans-serif" }}>
                {t.period}
              </p>
            </div>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.4 + index * 0.15 }}
            className="px-4 py-2 rounded-full border"
            style={{ borderColor: accentBorder, background: accentBg }}
          >
            <span className={`text-xl sm:text-2xl font-black ${accentClass}`} style={{ fontFamily: "'Sora', sans-serif" }}>
              {t.multiplier}
            </span>
          </motion.div>
        </div>

        {/* Before bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-cream/30" style={{ fontFamily: "'Sora', sans-serif" }}>
              Before
            </span>
            <span className="text-sm font-semibold text-cream/40 line-through" style={{ fontFamily: "'Sora', sans-serif" }}>
              {t.beforeLabel}
            </span>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ background: "oklch(0.15 0.02 260)" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={isInView ? { width: `${beforeWidth}%` } : {}}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.2 + index * 0.15 }}
              className="h-full rounded-full"
              style={{ background: "oklch(0.3 0.02 260)" }}
            />
          </div>
        </div>

        {/* Arrow */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.5 + index * 0.15 }}
          className="flex items-center gap-2 my-2"
        >
          <ArrowRight size={14} className={accentClass} />
          <span className={`text-[10px] font-bold tracking-wider uppercase ${accentClass}`} style={{ fontFamily: "'Sora', sans-serif" }}>
            After ALP
          </span>
        </motion.div>

        {/* After bar */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-[10px] font-semibold tracking-[0.15em] uppercase ${accentClass}`} style={{ fontFamily: "'Sora', sans-serif" }}>
              After
            </span>
            <motion.span
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ duration: 0.6, delay: 0.8 + index * 0.15 }}
              className={`text-2xl sm:text-3xl font-black ${accentClass}`}
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              {t.afterLabel}
            </motion.span>
          </div>
          <div className="h-5 rounded-full overflow-hidden" style={{ background: "oklch(0.15 0.02 260)" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={isInView ? { width: `${afterWidth}%` } : {}}
              transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1], delay: 0.4 + index * 0.15 }}
              className="h-full rounded-full relative"
              style={{ background: barGradient }}
            >
              {/* Shimmer effect */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `linear-gradient(90deg, transparent, ${accentColor}40, transparent)`,
                  backgroundSize: "200% 100%",
                }}
                animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear", delay: 1.5 + index * 0.15 }}
              />
            </motion.div>
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
            The Numbers Don't Lie
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
            <TransformationRow key={t.name} t={t} index={i} />
          ))}
        </div>

        {/* Disclaimer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center text-xs text-cream/25 mt-8 max-w-lg mx-auto"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Results vary. These are real members who committed to the process, showed up consistently, and executed on what they learned.
        </motion.p>
      </div>
    </section>
  );
}
