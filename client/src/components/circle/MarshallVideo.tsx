import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { Play, TrendingUp } from "lucide-react";

const easeOutCubic = [0.22, 1, 0.36, 1] as [number, number, number, number];

const HERO_IMAGE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663332724241/F8sHs44hWg957N49MHxas2/marshall_hero_6c478c8c.webp";

const transformations = [
  {
    name: "Brian Betancourt",
    from: "$600K",
    to: "$20M",
    period: "18 months",
    color: "ember",
  },
  {
    name: "Morgan Tyler",
    from: "$300K",
    to: "$10M",
    period: "first year",
    color: "blue",
  },
  {
    name: "Ronnie Silva",
    from: "$0",
    to: "$2M",
    period: "2nd month as contractor",
    color: "ember",
  },
];

function TransformationCard({
  t,
  index,
  isInView,
}: {
  t: (typeof transformations)[0];
  index: number;
  isInView: boolean;
}) {
  const isEmber = t.color === "ember";
  const accentColor = isEmber ? "oklch(0.72 0.12 55)" : "oklch(0.55 0.1 240)";
  const accentClass = isEmber ? "text-ember" : "text-blue-accent";
  const borderStyle = {
    borderColor: isEmber
      ? "oklch(0.72 0.12 55 / 0.2)"
      : "oklch(0.55 0.1 240 / 0.2)",
  };
  const bgStyle = {
    background: isEmber
      ? "linear-gradient(135deg, oklch(0.72 0.12 55 / 0.06), transparent)"
      : "linear-gradient(135deg, oklch(0.55 0.1 240 / 0.06), transparent)",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.7, ease: easeOutCubic, delay: 0.3 + index * 0.12 }}
      className="rounded-2xl p-5 sm:p-6 border"
      style={{ ...borderStyle, ...bgStyle }}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center border"
          style={{
            borderColor: isEmber
              ? "oklch(0.72 0.12 55 / 0.25)"
              : "oklch(0.55 0.1 240 / 0.25)",
            background: isEmber
              ? "oklch(0.72 0.12 55 / 0.1)"
              : "oklch(0.55 0.1 240 / 0.1)",
          }}
        >
          <TrendingUp size={14} className={accentClass} />
        </div>
        <span
          className="text-[10px] font-semibold tracking-[0.15em] uppercase text-cream/30"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          {t.period}
        </span>
      </div>

      <p
        className="text-xs font-semibold text-cream/50 mb-2"
        style={{ fontFamily: "'Sora', sans-serif" }}
      >
        {t.name}
      </p>

      <div className="flex items-center gap-2">
        <span
          className="text-sm text-cream/35 line-through"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          {t.from}
        </span>
        <span className="text-cream/20 text-xs">→</span>
        <span
          className={`text-xl sm:text-2xl font-bold ${accentClass}`}
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          {t.to}
        </span>
      </div>
    </motion.div>
  );
}

export function MarshallVideo() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-80px" });
  const [videoPlaying, setVideoPlaying] = useState(false);

  return (
    <section ref={sectionRef} className="relative z-10 py-20 sm:py-28 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: easeOutCubic }}
          className="text-center mb-14"
        >
          <motion.p
            initial={{ opacity: 0, letterSpacing: "0.5em" }}
            animate={isInView ? { opacity: 1, letterSpacing: "0.2em" } : {}}
            transition={{ duration: 1, ease: easeOutCubic }}
            className="text-xs font-semibold uppercase text-ember mb-4"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            From Marshall
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 25 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, ease: easeOutCubic, delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-cream leading-tight mb-4"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            $2.5 Billion in Construction.{" "}
            <span className="text-ember">One Circle.</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, ease: easeOutCubic, delay: 0.2 }}
            className="text-base sm:text-lg text-cream/50 max-w-2xl mx-auto leading-relaxed"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Marshall built and scaled contracting operations across the country. Now he's sharing everything — live, every two weeks, with the operators inside The Contractor Circle.
          </motion.p>

          <motion.div
            initial={{ scaleX: 0 }}
            animate={isInView ? { scaleX: 1 } : {}}
            transition={{ duration: 1, delay: 0.4, ease: easeOutCubic }}
            className="w-16 h-[2px] mx-auto mt-6"
            style={{
              background:
                "linear-gradient(90deg, transparent, oklch(0.72 0.12 55), transparent)",
              transformOrigin: "center",
            }}
          />
        </motion.div>

        {/* Main layout: video + transformation cards */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 items-start">
          {/* Video placeholder */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
            transition={{ duration: 0.9, ease: easeOutCubic, delay: 0.15 }}
            className="relative"
          >
            {/* Ambient glow */}
            <div
              className="absolute -inset-6 rounded-3xl blur-3xl pointer-events-none opacity-40"
              style={{
                background:
                  "radial-gradient(ellipse at center, oklch(0.72 0.12 55 / 0.12), transparent 70%)",
              }}
            />

            <div
              className="relative rounded-2xl overflow-hidden border"
              style={{ borderColor: "oklch(0.72 0.12 55 / 0.2)" }}
            >
              {/* 16:9 container */}
              <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                {/* Background image */}
                <img
                  src={HERO_IMAGE}
                  alt="Marshall Wilkinson"
                  className="absolute inset-0 w-full h-full object-cover object-top"
                />

                {/* Dark overlay */}
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(180deg, oklch(0.08 0.02 260 / 0.3) 0%, oklch(0.08 0.02 260 / 0.6) 100%)",
                  }}
                />

                {/* Coming soon overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  {/* Play button */}
                  <motion.div
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.96 }}
                    className="relative cursor-pointer mb-4"
                  >
                    {/* Outer pulse ring */}
                    <motion.div
                      className="absolute inset-0 rounded-full border-2"
                      style={{ borderColor: "oklch(0.72 0.12 55 / 0.3)" }}
                      animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <div
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center border-2"
                      style={{
                        borderColor: "oklch(0.72 0.12 55 / 0.5)",
                        background: "oklch(0.72 0.12 55 / 0.15)",
                        backdropFilter: "blur(8px)",
                      }}
                    >
                      <Play
                        size={24}
                        className="text-ember ml-1"
                        fill="currentColor"
                      />
                    </div>
                  </motion.div>

                  {/* Coming soon label */}
                  <div
                    className="px-4 py-2 rounded-full border backdrop-blur-sm"
                    style={{
                      borderColor: "oklch(0.72 0.12 55 / 0.3)",
                      background: "oklch(0.08 0.02 260 / 0.7)",
                    }}
                  >
                    <p
                      className="text-xs font-semibold tracking-[0.15em] uppercase text-ember"
                      style={{ fontFamily: "'Sora', sans-serif" }}
                    >
                      Video Introduction — Coming Soon
                    </p>
                  </div>
                </div>

                {/* Bottom label bar */}
                <div
                  className="absolute bottom-0 left-0 right-0 px-5 py-4 border-t"
                  style={{
                    borderColor: "oklch(0.72 0.12 55 / 0.12)",
                    background: "oklch(0.08 0.02 260 / 0.85)",
                    backdropFilter: "blur(12px)",
                  }}
                >
                  <p
                    className="text-sm font-semibold text-cream/80"
                    style={{ fontFamily: "'Sora', sans-serif" }}
                  >
                    Marshall Wilkinson
                  </p>
                  <p
                    className="text-xs text-cream/40"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    Founder, ALP · $2.5B+ in Construction
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Transformation cards */}
          <div className="space-y-4">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, ease: easeOutCubic, delay: 0.2 }}
              className="text-xs font-semibold tracking-[0.2em] uppercase text-cream/30 mb-5"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Member Transformations
            </motion.p>

            {transformations.map((t, i) => (
              <TransformationCard
                key={t.name}
                t={t}
                index={i}
                isInView={isInView}
              />
            ))}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, ease: easeOutCubic, delay: 0.65 }}
              className="pt-2"
            >
              <p
                className="text-xs text-cream/30 leading-relaxed"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Results vary. These are real members who committed to the process, showed up consistently, and executed on what they learned.
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
