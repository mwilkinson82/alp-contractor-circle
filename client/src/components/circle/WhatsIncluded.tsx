import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const easeOutCubic = [0.22, 1, 0.36, 1] as [number, number, number, number];

// ─── Benefit data ─────────────────────────────────────────────────────────────
const benefits = [
  {
    number: "01",
    emoji: "📞",
    headline: "Live Calls With Marshall",
    sub: "Every other Sunday · 5 PM ET · Starting Mar 29",
    hook: "Bring your real deal. Leave with your next move.",
    accent: "ember",
    isLive: true,
  },
  {
    number: "02",
    emoji: "🔥",
    headline: "Hot Seat Deal Reviews",
    sub: "Live bid & proposal breakdowns",
    hook: "Members have added six figures to a single deal from one session.",
    accent: "blue",
  },
  {
    number: "03",
    emoji: "💬",
    headline: "Your Questions Answered",
    sub: "Submit before every call",
    hook: "Nothing gets buried. Every question gets addressed.",
    accent: "ember",
  },
  {
    number: "04",
    emoji: "🎓",
    headline: "Monthly Deep-Dive Bootcamp",
    sub: "One topic. Fully worked through.",
    hook: "Estimating. Hiring. Sales. Operations. One system per month.",
    accent: "blue",
  },
  {
    number: "05",
    emoji: "📄",
    headline: "Premium Template Library",
    sub: "Built from $2.5B+ in real execution",
    hook: "Contracts, SOPs, bid sheets — download and deploy this week.",
    accent: "ember",
  },
  {
    number: "06",
    emoji: "🤝",
    headline: "The ALP Rolodex",
    sub: "Vetted subs, suppliers & attorneys",
    hook: "One referral from this network pays for years of membership.",
    accent: "blue",
  },
  {
    number: "07",
    emoji: "📊",
    headline: "Pricing Intelligence",
    sub: "Real market benchmarks from real members",
    hook: "Know what the market pays — not what you're guessing.",
    accent: "ember",
  },
  {
    number: "08",
    emoji: "🏆",
    headline: "Founding Member Privileges",
    sub: "First access · Locked pricing · Forever",
    hook: "Every future ALP program — you get in first, at founding rate.",
    accent: "blue",
  },
];

// ─── Single benefit row ────────────────────────────────────────────────────────
function BenefitRow({
  item,
  index,
}: {
  item: (typeof benefits)[0];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  const isEmber = item.accent === "ember";
  const accentColor = isEmber ? "oklch(0.72 0.12 55)" : "oklch(0.55 0.1 240)";
  const borderColor = isEmber
    ? "oklch(0.72 0.12 55 / 0.18)"
    : "oklch(0.55 0.1 240 / 0.18)";
  const glowColor = isEmber
    ? "oklch(0.72 0.12 55 / 0.12)"
    : "oklch(0.55 0.1 240 / 0.12)";
  const hookColor = isEmber ? "text-ember" : "text-blue-accent";

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.75, ease: easeOutCubic, delay: index * 0.06 }}
      className="relative group"
    >
      {/* Card */}
      <div
        className="relative rounded-2xl sm:rounded-3xl p-6 sm:p-8 border overflow-hidden transition-all duration-500 hover:-translate-y-0.5"
        style={{
          borderColor,
          background: `linear-gradient(135deg, ${glowColor}, oklch(0.10 0.02 260 / 0.95))`,
        }}
      >
        {/* Ambient glow on hover */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none rounded-2xl sm:rounded-3xl"
          style={{
            background: `radial-gradient(ellipse at 20% 50%, ${glowColor}, transparent 70%)`,
          }}
        />

        <div className="relative z-10 flex items-start gap-5 sm:gap-7">
          {/* Left: number + emoji */}
          <div className="flex flex-col items-center gap-2 shrink-0 pt-1">
            <span
              className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-35"
              style={{ color: accentColor, fontFamily: "'Sora', sans-serif" }}
            >
              {item.number}
            </span>
            <span className="text-3xl sm:text-4xl leading-none select-none">
              {item.emoji}
            </span>
            {item.isLive && (
              <span className="relative flex items-center justify-center w-2.5 h-2.5 mt-1">
                <span
                  className="absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{
                    background: "oklch(0.55 0.22 25)",
                    animation: "live-pulse 1.8s ease-out infinite",
                  }}
                />
                <span
                  className="relative inline-flex rounded-full w-2 h-2"
                  style={{ background: "oklch(0.60 0.22 25)" }}
                />
              </span>
            )}
          </div>

          {/* Right: text content */}
          <div className="flex-1 min-w-0">
            {/* Sub-label */}
            <p
              className="text-[10px] sm:text-[11px] font-semibold tracking-[0.15em] uppercase mb-2 opacity-50"
              style={{ color: accentColor, fontFamily: "'Sora', sans-serif" }}
            >
              {item.sub}
            </p>

            {/* BIG headline */}
            <h3
              className="text-2xl sm:text-3xl md:text-4xl font-bold text-cream leading-[1.1] tracking-tight mb-3"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              {item.headline}
            </h3>

            {/* Hook line — one punchy sentence */}
            <p
              className={`text-sm sm:text-base font-semibold leading-snug ${hookColor}`}
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {item.hook}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main section ──────────────────────────────────────────────────────────────
export default function WhatsIncluded() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const titleInView = useInView(sectionRef, { once: true, margin: "-80px" });

  return (
    <section
      ref={sectionRef}
      className="relative z-10 py-14 sm:py-20 lg:py-28 px-4 sm:px-6"
      style={{
        background:
          "linear-gradient(180deg, oklch(0.08 0.02 260) 0%, oklch(0.10 0.02 260) 50%, oklch(0.08 0.02 260) 100%)",
      }}
    >
      {/* Section header */}
      <div className="max-w-4xl mx-auto mb-12 sm:mb-16 text-center">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={titleInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: easeOutCubic }}
          className="text-[10px] sm:text-xs font-bold tracking-[0.25em] uppercase text-ember/70 mb-4"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          What You Get
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          animate={titleInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.85, ease: easeOutCubic, delay: 0.1 }}
          className="text-3xl sm:text-5xl md:text-6xl font-bold text-cream leading-[1.05] tracking-tight mb-5"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          Everything You Need
          <br />
          <span className="text-ember">To Scale.</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={titleInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: easeOutCubic, delay: 0.2 }}
          className="text-base sm:text-lg text-cream/50 max-w-xl mx-auto"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Eight unfair advantages — in one $497/month membership.
        </motion.p>
      </div>

      {/* Benefit stack */}
      <div className="max-w-3xl mx-auto flex flex-col gap-4 sm:gap-5">
        {benefits.map((item, i) => (
          <BenefitRow key={item.number} item={item} index={i} />
        ))}
      </div>

      {/* Bottom CTA nudge */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={titleInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, ease: easeOutCubic, delay: 0.5 }}
        className="max-w-3xl mx-auto mt-10 sm:mt-12 text-center"
      >
        <p
          className="text-xs text-cream/30"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          All of this — for less than one hour of a business attorney.
        </p>
      </motion.div>
    </section>
  );
}
