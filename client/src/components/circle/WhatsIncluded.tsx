import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Calendar, BarChart3, GraduationCap, FileText, Users, MessageCircle } from "lucide-react";

const features = [
  {
    icon: Calendar,
    title: "Weekly Group Call",
    subtitle: "Thursday Evenings",
    description: "Live hot seats, Q&A, and strategic teaching sessions led by Marshall. Bring your real problems — leave with real solutions.",
    accent: "from-ember/20 to-ember/5",
  },
  {
    icon: BarChart3,
    title: "Monthly Deal Reviews",
    subtitle: "Live Proposal Breakdowns",
    description: "Marshall reviews your actual proposals, bids, and deals. Get expert eyes on your numbers before you present to the client.",
    accent: "from-blue-accent/20 to-blue-accent/5",
  },
  {
    icon: GraduationCap,
    title: "Monthly Bootcamp",
    subtitle: "Deep-Dive Training",
    description: "One focused topic each month — estimating, hiring, sales process, marketing. Intensive sessions that move the needle.",
    accent: "from-ember/20 to-ember/5",
  },
  {
    icon: FileText,
    title: "Template Library",
    subtitle: "Battle-Tested Documents",
    description: "SOPs, contracts, spreadsheets, and operational docs built from $2.5B+ in real-world execution. Stop guessing — use what works.",
    accent: "from-blue-accent/20 to-blue-accent/5",
  },
  {
    icon: Users,
    title: "Private Community",
    subtitle: "24/7 Access via Discord",
    description: "A curated network of serious contractors. Share wins, ask questions, get accountability from operators who understand the game.",
    accent: "from-ember/20 to-ember/5",
  },
  {
    icon: MessageCircle,
    title: "Replay Library",
    subtitle: "Never Miss a Session",
    description: "Every call, bootcamp, and deal review recorded and organized. New members get instant access to the entire archive.",
    accent: "from-blue-accent/20 to-blue-accent/5",
  },
];

const easeOutCubic = [0.22, 1, 0.36, 1] as [number, number, number, number];

function FeatureCard({ feature, index }: { feature: typeof features[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  // Alternate animation direction for visual interest
  const fromLeft = index % 2 === 0;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: fromLeft ? -40 : 40, y: 30 }}
      animate={isInView ? { opacity: 1, x: 0, y: 0 } : {}}
      transition={{ duration: 0.8, ease: easeOutCubic, delay: index * 0.1 }}
      className="group relative"
    >
      <div className="relative rounded-2xl p-6 sm:p-7 border border-cream/[0.06] bg-gradient-to-br from-cream/[0.03] to-transparent overflow-hidden transition-all duration-500 hover:border-ember/20 hover:translate-y-[-4px] hover:shadow-[0_20px_60px_oklch(0.72_0.12_55/0.08)]">
        {/* Animated top border on hover */}
        <motion.div
          className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: "linear-gradient(90deg, transparent, oklch(0.72 0.12 55), transparent)",
          }}
        />

        {/* Background gradient on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
          style={{ background: "radial-gradient(circle at 30% 20%, oklch(0.72 0.12 55 / 0.04), transparent 60%)" }}
        />

        {/* Icon with animated ring */}
        <div className="relative mb-5">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={isInView ? { scale: 1, rotate: 0 } : {}}
            transition={{ duration: 0.6, ease: easeOutCubic, delay: index * 0.1 + 0.2 }}
            className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.accent} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}
          >
            <feature.icon size={22} className="text-ember" />
          </motion.div>
          {/* Pulse ring on hover */}
          <div className="absolute inset-0 w-12 h-12 rounded-xl border border-ember/0 group-hover:border-ember/20 group-hover:scale-125 transition-all duration-500 opacity-0 group-hover:opacity-100" />
        </div>

        {/* Title */}
        <h3
          className="text-lg font-bold text-cream mb-1 group-hover:text-ember transition-colors duration-300"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          {feature.title}
        </h3>

        {/* Subtitle */}
        <p className="text-[11px] font-semibold text-ember/70 tracking-[0.15em] uppercase mb-3" style={{ fontFamily: "'Sora', sans-serif" }}>
          {feature.subtitle}
        </p>

        {/* Description */}
        <p className="text-sm text-cream/60 leading-[1.7]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          {feature.description}
        </p>
      </div>
    </motion.div>
  );
}

export function WhatsIncluded() {
  const headerRef = useRef<HTMLDivElement>(null);
  const isHeaderInView = useInView(headerRef, { once: true, margin: "-60px" });

  return (
    <section className="relative z-10 py-20 sm:py-28 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <div ref={headerRef} className="text-center mb-16">
          <motion.p
            initial={{ opacity: 0, letterSpacing: "0.5em" }}
            animate={isHeaderInView ? { opacity: 1, letterSpacing: "0.2em" } : {}}
            transition={{ duration: 1, ease: easeOutCubic }}
            className="text-xs font-semibold uppercase text-ember mb-4"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            What You Get
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={isHeaderInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, ease: easeOutCubic, delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-cream leading-tight mb-5"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Everything You Need to{" "}
            <span className="text-ember">Execute</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isHeaderInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, ease: easeOutCubic, delay: 0.2 }}
            className="text-base sm:text-lg text-cream/50 max-w-2xl mx-auto leading-relaxed"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            This isn't another course you watch and forget. This is a live execution environment where you show up, get coached, and leave with clarity.
          </motion.p>

          <motion.div
            initial={{ scaleX: 0 }}
            animate={isHeaderInView ? { scaleX: 1 } : {}}
            transition={{ duration: 1, delay: 0.4, ease: easeOutCubic }}
            className="w-16 h-[2px] mx-auto mt-6"
            style={{
              background: "linear-gradient(90deg, transparent, oklch(0.72 0.12 55), transparent)",
              transformOrigin: "center",
            }}
          />
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, i) => (
            <FeatureCard key={feature.title} feature={feature} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
