import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";

const FOUNDING_SPOTS = 50;
const easeOutCubic = [0.22, 1, 0.36, 1] as [number, number, number, number];

function AnimatedNumber({
  target,
  prefix,
  suffix,
  label,
  textValue,
  delay = 0,
}: {
  target: number;
  prefix: string;
  suffix: string;
  label: string;
  textValue?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView || textValue) return;
    const duration = 2200;
    const steps = 70;
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
  }, [isInView, target, textValue]);

  const displayValue = textValue
    ? textValue
    : target >= 100
    ? `${prefix}${Math.round(count).toLocaleString()}${suffix}`
    : `${prefix}${count.toFixed(1)}${suffix}`;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 35, scale: 0.92 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.8, ease: easeOutCubic, delay }}
      className="text-center relative group px-4"
    >
      {/* Glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-24 h-24 rounded-full bg-ember/5 blur-2xl group-hover:bg-ember/10 transition-all duration-500" />
      </div>

      <p
        className="text-3xl sm:text-4xl md:text-5xl font-bold text-ember mb-2 relative"
        style={{ fontFamily: "'Sora', sans-serif" }}
      >
        {displayValue}
      </p>
      <p
        className="text-xs sm:text-sm text-cream/45 tracking-wide leading-snug"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {label}
      </p>
    </motion.div>
  );
}

export function ValueProps() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-60px" });

  const { data: countData } = trpc.member.count.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });
  const memberCount = countData?.count ?? 0;
  const spotsLeft = Math.max(0, FOUNDING_SPOTS - memberCount);

  const stats = [
    {
      label: "In Construction Experience",
      numericTarget: 2.5,
      prefix: "$",
      suffix: "B+",
      delay: 0,
    },
    {
      label: "Contractors Trained",
      numericTarget: 333,
      prefix: "",
      suffix: "+",
      delay: 0.12,
    },
    {
      label: "Founding Spots Remaining",
      numericTarget: 0,
      prefix: "",
      suffix: "",
      textValue: spotsLeft > 0 ? `${spotsLeft} of ${FOUNDING_SPOTS}` : "Full",
      delay: 0.24,
    },
  ];

  return (
    <section ref={sectionRef} className="relative z-10 py-14 sm:py-20 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2 sm:gap-6 mb-12">
          {stats.map((stat) => (
            <AnimatedNumber
              key={stat.label}
              target={stat.numericTarget}
              prefix={stat.prefix}
              suffix={stat.suffix}
              label={stat.label}
              textValue={stat.textValue}
              delay={stat.delay}
            />
          ))}
        </div>

        {/* Divider */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={isInView ? { scaleX: 1, opacity: 1 } : {}}
          transition={{ duration: 1.2, ease: easeOutCubic, delay: 0.5 }}
          className="h-px bg-gradient-to-r from-transparent via-ember/25 to-transparent"
          style={{ transformOrigin: "center" }}
        />

        {/* Marshall credibility line */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: easeOutCubic, delay: 0.7 }}
          className="text-center mt-8"
        >
          <p
            className="text-sm text-cream/35 tracking-wide"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Marshall Wilkinson has built and scaled contracting operations across the country.{" "}
            <span className="text-cream/55">
              Now he's coaching the next generation of operators — live, every two weeks.
            </span>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
