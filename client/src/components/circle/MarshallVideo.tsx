import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Maximize2, TrendingUp, Users, Zap, Clock } from "lucide-react";

const easeOutCubic = [0.22, 1, 0.36, 1] as [number, number, number, number];

const HERO_IMAGE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663332724241/F8sHs44hWg957N49MHxas2/marshall_hero_6c478c8c.webp";

const stats = [
  {
    icon: TrendingUp,
    value: "$100M+",
    label: "Revenue Generated",
    description: "Across all ALP members",
    accent: "ember" as const,
  },
  {
    icon: Users,
    value: "15+",
    label: "Companies Scaling",
    description: "Actively growing right now",
    accent: "blue" as const,
  },
  {
    icon: Zap,
    value: "33×",
    label: "Highest Multiplier",
    description: "$600K to $20M",
    accent: "ember" as const,
  },
  {
    icon: Clock,
    value: "1 Mo",
    label: "Fastest Result",
    description: "Time to first revenue jump",
    accent: "blue" as const,
  },
];

const ACCENT = {
  ember: {
    color: "oklch(0.72 0.12 55)",
    bg: "oklch(0.72 0.12 55 / 0.08)",
    border: "oklch(0.72 0.12 55 / 0.2)",
    glow: "oklch(0.72 0.12 55 / 0.15)",
  },
  blue: {
    color: "oklch(0.65 0.12 240)",
    bg: "oklch(0.65 0.12 240 / 0.08)",
    border: "oklch(0.65 0.12 240 / 0.2)",
    glow: "oklch(0.65 0.12 240 / 0.15)",
  },
};

function StatCard({
  stat,
  index,
  isInView,
}: {
  stat: (typeof stats)[0];
  index: number;
  isInView: boolean;
}) {
  const a = ACCENT[stat.accent];
  const Icon = stat.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.6, ease: easeOutCubic, delay: 0.25 + index * 0.1 }}
      className="relative rounded-2xl p-5 border overflow-hidden group"
      style={{ borderColor: a.border, background: `linear-gradient(135deg, ${a.bg}, transparent)` }}
    >
      {/* Hover glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: `radial-gradient(circle at 50% 0%, ${a.glow}, transparent 70%)` }}
      />

      <div className="relative z-10">
        {/* Icon */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center border mb-3"
          style={{ borderColor: a.border, background: a.bg }}
        >
          <Icon size={16} style={{ color: a.color }} />
        </div>

        {/* Value */}
        <p
          className="text-2xl sm:text-3xl font-black leading-none mb-1"
          style={{
            color: a.color,
            fontFamily: "'Sora', sans-serif",
            letterSpacing: "-0.03em",
            textShadow: `0 0 20px ${a.glow}`,
          }}
        >
          {stat.value}
        </p>

        {/* Label */}
        <p
          className="text-xs font-semibold text-cream/60 mb-0.5"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          {stat.label}
        </p>

        {/* Description */}
        <p
          className="text-[10px] text-cream/30"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          {stat.description}
        </p>
      </div>
    </motion.div>
  );
}

export function MarshallVideo() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-80px" });

  return (
    <section ref={sectionRef} className="relative z-10 py-14 sm:py-20 lg:py-28 px-4 sm:px-6">
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

        {/* Main layout: video + stats */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 sm:gap-8 items-start">
          {/* Video — 16:9 landscape */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
            transition={{ duration: 0.9, ease: easeOutCubic, delay: 0.15 }}
            className="relative w-full"
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
              {/* 16:9 landscape container */}
              <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                <iframe
                  src={`https://iframe.videodelivery.net/b42d7a04024bff7aed381c607dd2d0eb?autoplay=false&loop=false&muted=false&preload=none&responsive=true&poster=${encodeURIComponent(HERO_IMAGE)}`}
                  loading="lazy"
                  allow="accelerometer; gyroscope; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen={true}
                  className="absolute inset-0 w-full h-full border-0"
                  title="Marshall Wilkinson — ALP Contractor Circle"
                />
              </div>

              {/* Label bar below the video */}
              <div
                className="px-5 py-3 border-t flex items-center justify-between"
                style={{
                  borderColor: "oklch(0.72 0.12 55 / 0.15)",
                  background: "oklch(0.08 0.02 260 / 0.95)",
                }}
              >
                <div>
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
                <button
                  onClick={() => {
                    const iframe = document.querySelector(
                      "iframe[src*='videodelivery.net']"
                    ) as HTMLIFrameElement | null;
                    if (iframe) {
                      if (iframe.requestFullscreen) iframe.requestFullscreen();
                    }
                  }}
                  className="ml-3 flex-shrink-0 p-2 rounded-lg transition-colors"
                  style={{
                    background: "oklch(0.72 0.12 55 / 0.12)",
                    color: "oklch(0.72 0.12 55)",
                  }}
                  title="Fullscreen"
                  aria-label="Open video fullscreen"
                >
                  <Maximize2 size={14} />
                </button>
              </div>
            </div>
          </motion.div>

          {/* By The Numbers — stats block */}
          <div className="space-y-3">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, ease: easeOutCubic, delay: 0.2 }}
              className="text-xs font-semibold tracking-[0.2em] uppercase text-cream/30 mb-4"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              By The Numbers
            </motion.p>

            {stats.map((stat, i) => (
              <StatCard key={stat.label} stat={stat} index={i} isInView={isInView} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
