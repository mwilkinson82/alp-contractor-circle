import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";

const stats = [
  { value: "$2.5B+", label: "In Construction Experience", numericTarget: 2.5, prefix: "$", suffix: "B+" },
  { value: "333+", label: "Contractors Trained", numericTarget: 333, prefix: "", suffix: "+" },
  { value: "Daily", label: "Live Execution Rooms", numericTarget: 0, prefix: "", suffix: "" },
];

const easeOutCubic = [0.22, 1, 0.36, 1] as [number, number, number, number];

function AnimatedNumber({ target, prefix, suffix, label, isText }: { target: number; prefix: string; suffix: string; label: string; isText?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView || isText) return;
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(current);
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [isInView, target, isText]);

  const displayValue = isText ? "Daily" : target >= 100 ? `${prefix}${Math.round(count).toLocaleString()}${suffix}` : `${prefix}${count.toFixed(1)}${suffix}`;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40, scale: 0.9 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.8, ease: easeOutCubic }}
      className="text-center relative group"
    >
      {/* Glow behind number */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-20 h-20 rounded-full bg-ember/5 blur-xl group-hover:bg-ember/10 transition-all duration-500" />
      </div>
      <p
        className="text-3xl sm:text-4xl md:text-5xl font-bold text-ember mb-2 relative"
        style={{ fontFamily: "'Sora', sans-serif" }}
      >
        {displayValue}
      </p>
      <p className="text-xs sm:text-sm text-cream/50 tracking-wide" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        {label}
      </p>
    </motion.div>
  );
}

export function ValueProps() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-60px" });

  return (
    <section ref={sectionRef} className="relative z-10 py-16 sm:py-24 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 sm:gap-8 mb-16">
          {stats.map((stat, i) => (
            <AnimatedNumber
              key={stat.label}
              target={stat.numericTarget}
              prefix={stat.prefix}
              suffix={stat.suffix}
              label={stat.label}
              isText={stat.numericTarget === 0}
            />
          ))}
        </div>

        {/* Divider with animated expansion */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={isInView ? { scaleX: 1, opacity: 1 } : {}}
          transition={{ duration: 1.2, ease: easeOutCubic, delay: 0.5 }}
          className="h-px bg-gradient-to-r from-transparent via-ember/30 to-transparent"
          style={{ transformOrigin: "center" }}
        />
      </div>
    </section>
  );
}
