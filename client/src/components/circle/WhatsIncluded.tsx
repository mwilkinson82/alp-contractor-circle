import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { useRef } from "react";
import { Calendar, BarChart3, GraduationCap, FileText, Users, Video, Network, TrendingUp, Star, MessageSquare } from "lucide-react";

const timelineItems = [
  {
    icon: Calendar,
    number: "01",
    title: "Bi-Weekly Live Calls",
    subtitle: "Sundays · 5 PM ET · Starting Mar 29",
    headline: "You're in the room with Marshall — live, every two weeks.",
    hook: "Bring your real deal. Leave with your next move.",
    accent: "ember" as const,
    stat: "Live every 2 weeks",
    isLive: true,
  },
  {
    icon: BarChart3,
    number: "02",
    title: "Hot Seat Deal Reviews",
    subtitle: "Live Proposal & Bid Breakdowns",
    headline: "Marshall reviews your actual numbers before you present.",
    hook: "Members have added six figures to a single deal from one session.",
    accent: "blue" as const,
    stat: "Real proposals. Real feedback.",
  },
  {
    icon: MessageSquare,
    number: "03",
    title: "Direct Question Access",
    subtitle: "Submit Before Every Call",
    headline: "Your questions get answered — not buried.",
    hook: "Every question gets addressed. Nothing waits six months.",
    accent: "ember" as const,
    stat: "Every question addressed",
  },
  {
    icon: GraduationCap,
    number: "04",
    title: "Monthly Bootcamp",
    subtitle: "Deep-Dive Working Sessions",
    headline: "One topic. Fully worked through.",
    hook: "Estimating. Hiring. Sales. Operations. One system per month.",
    accent: "blue" as const,
    stat: "12 bootcamps per year",
  },
  {
    icon: FileText,
    number: "05",
    title: "Premium Template Library",
    subtitle: "Battle-Tested Documents",
    headline: "Stop building from scratch. Use what already works.",
    hook: "Contracts, SOPs, bid sheets — built from $2.5B+ in real execution.",
    accent: "ember" as const,
    stat: "Built from $2.5B+ in execution",
  },
  {
    icon: Network,
    number: "06",
    title: "The ALP Rolodex",
    subtitle: "Vetted Network Access",
    headline: "One referral from this network pays for years of membership.",
    hook: "Subs, suppliers, bonding contacts, attorneys — decades of relationships, day one.",
    accent: "blue" as const,
    stat: "Decades of relationships",
  },
  {
    icon: TrendingUp,
    number: "07",
    title: "Member Pricing Intelligence",
    subtitle: "Real Market Benchmarks",
    headline: "Know what the market is actually paying — not what you're guessing.",
    hook: "Real square-foot rates and margins from real markets. Pricing blind is expensive.",
    accent: "ember" as const,
    stat: "Real numbers from real markets",
  },
  {
    icon: Users,
    number: "08",
    title: "Private Community",
    subtitle: "24/7 Access via Discord",
    headline: "The network you've been missing.",
    hook: "Serious operators only. No noise. Marshall and the team are active daily.",
    accent: "blue" as const,
    stat: "Active operators only",
  },
  {
    icon: Video,
    number: "09",
    title: "Replay Library",
    subtitle: "Every Session Recorded",
    headline: "Never miss a breakthrough.",
    hook: "Every call, bootcamp, and deal review — organized and searchable from day one.",
    accent: "ember" as const,
    stat: "Growing archive from day one",
  },
  {
    icon: Star,
    number: "10",
    title: "Founding Member Privileges",
    subtitle: "First Access · Locked Pricing",
    headline: "Founding members get first access to everything ALP builds next.",
    hook: "Every future program, event, mastermind — you're in first, at founding rate. Forever.",
    accent: "blue" as const,
    stat: "Founding rate locked forever",
  },
];

/* ── Card content (shared between desktop & mobile) ── */
function CardContent({ item, accentClass }: { item: (typeof timelineItems)[0]; accentClass: string }) {
  const badgeBorder = item.accent === "ember" ? "oklch(0.72 0.12 55 / 0.2)" : "oklch(0.55 0.1 240 / 0.2)";
  const badgeBg = item.accent === "ember" ? "oklch(0.72 0.12 55 / 0.06)" : "oklch(0.55 0.1 240 / 0.06)";

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <span className={`text-[10px] font-bold tracking-[0.2em] uppercase ${accentClass} opacity-60`} style={{ fontFamily: "'Sora', sans-serif" }}>
          {item.number}
        </span>
        <div className="flex items-center gap-2">
          {item.isLive && (
            <span className="relative flex items-center justify-center w-3 h-3 shrink-0">
              <span className="absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "oklch(0.55 0.22 25)", animation: "live-pulse 1.8s ease-out infinite" }} />
              <span className="relative inline-flex rounded-full w-2 h-2" style={{ background: "oklch(0.60 0.22 25)" }} />
            </span>
          )}
          <span className="text-[10px] font-medium tracking-[0.12em] uppercase text-cream/30" style={{ fontFamily: "'Sora', sans-serif" }}>
            {item.subtitle}
          </span>
        </div>
      </div>
      <h3 className="text-xl sm:text-2xl font-bold text-cream mb-2 leading-tight" style={{ fontFamily: "'Sora', sans-serif" }}>
        {item.title}
      </h3>
      <p className={`text-sm sm:text-base font-semibold ${accentClass} mb-3 leading-snug`} style={{ fontFamily: "'DM Sans', sans-serif" }}>
        {item.headline}
      </p>
      <p className="text-sm text-cream/55 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        {item.hook}
      </p>
      <div className="mt-5">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold tracking-wide uppercase ${accentClass} border`}
          style={{ fontFamily: "'Sora', sans-serif", borderColor: badgeBorder, backgroundColor: badgeBg }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 shrink-0" />
          {item.stat}
        </span>
      </div>
    </>
  );
}

/* ── Smooth scroll-linked timeline card ── */
function TimelineCard({ item, index, isLast }: { item: (typeof timelineItems)[0]; index: number; isLast: boolean }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const isLeft = index % 2 === 0;

  const accentColor = item.accent === "ember" ? "oklch(0.72 0.12 55)" : "oklch(0.55 0.1 240)";
  const accentClass = item.accent === "ember" ? "text-ember" : "text-blue-accent";
  const borderColor = item.accent === "ember" ? "oklch(0.72 0.12 55 / 0.18)" : "oklch(0.55 0.1 240 / 0.18)";
  const cardBg = item.accent === "ember"
    ? "linear-gradient(135deg, oklch(0.72 0.12 55 / 0.05), transparent)"
    : "linear-gradient(135deg, oklch(0.55 0.1 240 / 0.05), transparent)";
  const iconBgColor = item.accent === "ember" ? "oklch(0.72 0.12 55 / 0.08)" : "oklch(0.55 0.1 240 / 0.08)";

  /* Scroll-linked progress: card enters viewport smoothly */
  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ["start 0.92", "start 0.5"],
  });

  /* Spring physics for buttery smooth motion */
  const smooth = useSpring(scrollYProgress, { stiffness: 60, damping: 20, restDelta: 0.001 });

  /* Derived transforms */
  const opacity = useTransform(smooth, [0, 0.4, 1], [0, 0.6, 1]);
  const y = useTransform(smooth, [0, 1], [50, 0]);
  const desktopX = useTransform(smooth, [0, 1], [isLeft ? -30 : 30, 0]);
  const cardScale = useTransform(smooth, [0, 1], [0.95, 1]);
  const iconScale = useTransform(smooth, [0, 0.5, 1], [0, 0.8, 1]);
  const iconOpacity = useTransform(smooth, [0, 0.5, 1], [0, 0.5, 1]);
  const lineScaleY = useTransform(smooth, [0.3, 1], [0, 1]);

  return (
    <div ref={cardRef} className="relative">
      {/* ── Desktop: alternating left/right ── */}
      <div className="hidden lg:grid lg:grid-cols-[1fr_64px_1fr] lg:items-start">
        {/* Left slot */}
        <div className="pr-10 pb-10">
          {isLeft ? (
            <motion.div
              style={{ opacity, y, x: desktopX, scale: cardScale, borderColor, background: cardBg }}
              className="rounded-2xl p-7 border transition-colors duration-500 hover:brightness-110 will-change-transform"
            >
              <CardContent item={item} accentClass={accentClass} />
            </motion.div>
          ) : <div />}
        </div>

        {/* Center spine */}
        <div className="flex flex-col items-center">
          <motion.div
            style={{ scale: iconScale, opacity: iconOpacity, borderColor, background: iconBgColor }}
            className="relative w-12 h-12 rounded-full flex items-center justify-center z-10 shrink-0 mt-2 border will-change-transform"
          >
            <motion.div
              className="absolute inset-0 rounded-full border"
              style={{ borderColor }}
              animate={{ scale: [1, 1.35, 1], opacity: [0.4, 0, 0.4] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            <item.icon className={`w-5 h-5 ${accentClass}`} />
          </motion.div>
          {!isLast && (
            <motion.div
              style={{ scaleY: lineScaleY, background: `linear-gradient(to bottom, ${accentColor}, transparent)`, minHeight: 40 }}
              className="w-px flex-1 mt-2 origin-top will-change-transform"
            />
          )}
        </div>

        {/* Right slot */}
        <div className="pl-10 pb-10">
          {!isLeft ? (
            <motion.div
              style={{ opacity, y, x: desktopX, scale: cardScale, borderColor, background: cardBg }}
              className="rounded-2xl p-7 border transition-colors duration-500 hover:brightness-110 will-change-transform"
            >
              <CardContent item={item} accentClass={accentClass} />
            </motion.div>
          ) : <div />}
        </div>
      </div>

      {/* ── Mobile / Tablet: vertical stack ── */}
      <div className="lg:hidden flex gap-4 sm:gap-6 pb-8 sm:pb-10">
        {/* Left: icon + line */}
        <div className="flex flex-col items-center shrink-0">
          <motion.div
            style={{ scale: iconScale, opacity: iconOpacity, borderColor, background: iconBgColor }}
            className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border mt-1 will-change-transform"
          >
            <item.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${accentClass}`} />
          </motion.div>
          {!isLast && (
            <div
              className="w-px flex-1 mt-2"
              style={{ background: `linear-gradient(to bottom, ${accentColor}55, transparent)`, minHeight: 32 }}
            />
          )}
        </div>

        {/* Right: card */}
        <motion.div
          style={{ opacity, y, scale: cardScale, borderColor, background: cardBg }}
          className="flex-1 rounded-2xl p-5 sm:p-6 border will-change-transform"
        >
          <CardContent item={item} accentClass={accentClass} />
        </motion.div>
      </div>
    </div>
  );
}

/* ── Main section ── */
export default function WhatsIncluded() {
  const sectionRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress: titleProgress } = useScroll({
    target: sectionRef,
    offset: ["start 0.88", "start 0.6"],
  });

  const titleSmooth = useSpring(titleProgress, { stiffness: 60, damping: 20, restDelta: 0.001 });
  const titleOpacity = useTransform(titleSmooth, [0, 1], [0, 1]);
  const titleY = useTransform(titleSmooth, [0, 1], [30, 0]);

  return (
    <section
      className="relative z-10 py-14 sm:py-20 lg:py-28 px-4 sm:px-6"
      style={{
        background: "linear-gradient(180deg, oklch(0.08 0.02 260) 0%, oklch(0.10 0.02 260) 50%, oklch(0.08 0.02 260) 100%)",
      }}
    >
      {/* Section header */}
      <div ref={sectionRef} className="max-w-4xl mx-auto mb-12 sm:mb-16 text-center">
        <motion.p
          style={{ opacity: titleOpacity, y: titleY, fontFamily: "'Sora', sans-serif" }}
          className="text-[10px] sm:text-xs font-bold tracking-[0.25em] uppercase text-ember/70 mb-4 will-change-transform"
        >
          What You Get
        </motion.p>

        <motion.h2
          style={{ opacity: titleOpacity, y: titleY, fontFamily: "'Sora', sans-serif" }}
          className="text-3xl sm:text-5xl md:text-6xl font-bold text-cream leading-[1.05] tracking-tight mb-5 will-change-transform"
        >
          Ten Unfair Advantages.
          <br />
          <span className="text-ember">One Membership.</span>
        </motion.h2>

        <motion.p
          style={{ opacity: titleOpacity, y: titleY, fontFamily: "'DM Sans', sans-serif" }}
          className="text-base sm:text-lg text-cream/50 max-w-xl mx-auto will-change-transform"
        >
          Everything serious contractors need to scale — for less than one hour of a business attorney.
        </motion.p>
      </div>

      {/* Timeline */}
      <div className="max-w-5xl mx-auto">
        {timelineItems.map((item, i) => (
          <TimelineCard
            key={item.number}
            item={item}
            index={i}
            isLast={i === timelineItems.length - 1}
          />
        ))}
      </div>
    </section>
  );
}
