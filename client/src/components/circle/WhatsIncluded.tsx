import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Calendar, BarChart3, GraduationCap, FileText, Users, Video, Network, TrendingUp, Star, MessageSquare } from "lucide-react";

const easeOutCubic = [0.22, 1, 0.36, 1] as [number, number, number, number];

const timelineItems = [
  {
    icon: Calendar,
    number: "01",
    title: "Bi-Weekly Live Calls",
    subtitle: "Sundays Bi-Weekly · 5 PM ET · Starting Mar 29",
    headline: "You're in the room with Marshall — live, every two weeks.",
    body: "Every other Sunday, you're on a live call with Marshall and contractors who are actually building. Bring your real challenges — pricing, hiring, client problems, growth questions. You leave with a clear next move, not more homework. This is the coaching call you've never had access to before.",
    accent: "ember",
    stat: "Live every 2 weeks",
  },
  {
    icon: BarChart3,
    number: "02",
    title: "Hot Seat Deal Reviews",
    subtitle: "Live Proposal & Bid Breakdowns",
    headline: "Marshall reviews your actual numbers before you present.",
    body: "Submit your real bids, proposals, and contracts for live review on the call. Marshall breaks down what's working, what's leaving money on the table, and exactly how to position for the close. Members have added six figures to single deals from one hot seat session. This alone is worth the membership.",
    accent: "blue",
    stat: "Real proposals. Real feedback.",
  },
  {
    icon: MessageSquare,
    number: "03",
    title: "Direct Question Access",
    subtitle: "Submit Before Every Call",
    headline: "Your questions get answered — not buried.",
    body: "Before every call, members submit their most pressing questions. Marshall reviews them and selects which ones to work through live. The ones that don't make the call get covered in the monthly bootcamp. You're never waiting six months to get an answer to something that's costing you money right now.",
    accent: "ember",
    stat: "Every question gets addressed",
  },
  {
    icon: GraduationCap,
    number: "04",
    title: "Monthly Bootcamp",
    subtitle: "Deep-Dive Working Sessions",
    headline: "One topic. Fully worked through.",
    body: "Every month, one focused deep-dive — estimating, hiring, sales process, marketing, operations. These aren't webinars. They're intensive working sessions built around the questions members actually submitted. You leave with a system you can implement the same week.",
    accent: "blue",
    stat: "12 bootcamps per year",
  },
  {
    icon: FileText,
    number: "05",
    title: "Premium Template Library",
    subtitle: "Battle-Tested Documents",
    headline: "Stop building from scratch. Use what already works.",
    body: "SOPs, contracts, estimating spreadsheets, change order templates, subcontractor agreements, and operational checklists — built from $2.5B+ in real-world execution. These are the actual documents used in high-performing contracting operations. Download, customize, and deploy immediately.",
    accent: "ember",
    stat: "Built from $2.5B+ in execution",
  },
  {
    icon: Network,
    number: "06",
    title: "The ALP Rolodex",
    subtitle: "Vetted Network Access",
    headline: "One referral from this network pays for years of membership.",
    body: "Access Marshall's vetted network of subcontractors, suppliers, bonding contacts, and attorneys — built over $2.5B in construction. Finding one reliable sub or getting the right bonding contact at the right moment can be worth hundreds of thousands of dollars. This network took decades to build. You get access day one.",
    accent: "blue",
    stat: "Decades of relationships",
  },
  {
    icon: TrendingUp,
    number: "07",
    title: "Member Pricing Intelligence",
    subtitle: "Real Market Benchmarks",
    headline: "Know what the market is actually paying — not what you're guessing.",
    body: "Members share real square-foot pricing, labor rates, and margin benchmarks from their markets. You'll know if you're underpricing in Dallas, overpriced in Phoenix, or leaving margin on the table in your own backyard. Pricing blind is one of the most expensive mistakes in contracting. This fixes it.",
    accent: "ember",
    stat: "Real numbers from real markets",
  },
  {
    icon: Users,
    number: "08",
    title: "Private Community",
    subtitle: "24/7 Access via Discord",
    headline: "The network you've been missing.",
    body: "A curated Discord server with serious operators only. Share wins, get deal help, ask questions, and build relationships with contractors who understand the game. Marshall and the team are active daily. This isn't a noisy Facebook group — it's a boardroom.",
    accent: "blue",
    stat: "Active operators only",
  },
  {
    icon: Video,
    number: "09",
    title: "Replay Library",
    subtitle: "Every Session Recorded",
    headline: "Never miss a breakthrough.",
    body: "Every call, bootcamp, and deal review is recorded and organized in your member portal. New members get instant access to the entire archive from day one. The library compounds — the longer you're in, the more valuable your membership becomes.",
    accent: "ember",
    stat: "Growing archive from day one",
  },
  {
    icon: Star,
    number: "10",
    title: "Founding Member Privileges",
    subtitle: "First Access · Locked Pricing",
    headline: "Founding members get first access to everything ALP builds next.",
    body: "Every future ALP program, course, live event, and mastermind — founding members get first access and founding pricing. You're not just joining a membership; you're getting in at the ground floor of a platform being built around the $2.5B operator who's coaching you. The price you lock in today is the price you keep.",
    accent: "blue",
    stat: "Founding rate locked forever",
  },
];

function CardContent({
  item,
  accentClass,
}: {
  item: (typeof timelineItems)[0];
  accentClass: string;
}) {
  const borderColor =
    item.accent === "ember"
      ? "oklch(0.72 0.12 55 / 0.2)"
      : "oklch(0.55 0.1 240 / 0.2)";
  const bgColor =
    item.accent === "ember"
      ? "oklch(0.72 0.12 55 / 0.06)"
      : "oklch(0.55 0.1 240 / 0.06)";

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <span
          className={`text-[10px] font-bold tracking-[0.2em] uppercase ${accentClass} opacity-60`}
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          {item.number}
        </span>
        <div className="flex items-center gap-2">
          {item.number === "01" && (
            <span className="relative flex items-center justify-center w-3 h-3">
              {/* Outer pulse ring */}
              <span
                className="absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{
                  background: "oklch(0.55 0.22 25)",
                  animation: "live-pulse 1.8s ease-out infinite",
                }}
              />
              {/* Inner solid dot */}
              <span
                className="relative inline-flex rounded-full w-2 h-2"
                style={{ background: "oklch(0.60 0.22 25)" }}
              />
            </span>
          )}
          <span
            className="text-[10px] font-medium tracking-[0.12em] uppercase text-cream/30"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            {item.subtitle}
          </span>
        </div>
      </div>

      <h3
        className="text-lg sm:text-xl font-bold text-cream mb-2"
        style={{ fontFamily: "'Sora', sans-serif" }}
      >
        {item.title}
      </h3>

      <p
        className={`text-sm font-semibold ${accentClass} mb-3 leading-snug`}
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {item.headline}
      </p>

      <p
        className="text-sm text-cream/55 leading-[1.75]"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {item.body}
      </p>

      <div className="mt-5">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold tracking-wide uppercase ${accentClass} border`}
          style={{
            fontFamily: "'Sora', sans-serif",
            borderColor,
            backgroundColor: bgColor,
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 shrink-0" />
          {item.stat}
        </span>
      </div>
    </>
  );
}

function TimelineItem({
  item,
  index,
  isLast,
}: {
  item: (typeof timelineItems)[0];
  index: number;
  isLast: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const isLeft = index % 2 === 0;

  const accentColor =
    item.accent === "ember" ? "oklch(0.72 0.12 55)" : "oklch(0.55 0.1 240)";
  const accentClass =
    item.accent === "ember" ? "text-ember" : "text-blue-accent";
  const borderStyle = {
    borderColor:
      item.accent === "ember"
        ? "oklch(0.72 0.12 55 / 0.18)"
        : "oklch(0.55 0.1 240 / 0.18)",
  };
  const bgStyle = {
    background:
      item.accent === "ember"
        ? "linear-gradient(135deg, oklch(0.72 0.12 55 / 0.05), transparent)"
        : "linear-gradient(135deg, oklch(0.55 0.1 240 / 0.05), transparent)",
  };
  const iconBg = {
    background:
      item.accent === "ember"
        ? "oklch(0.72 0.12 55 / 0.08)"
        : "oklch(0.55 0.1 240 / 0.08)",
  };

  return (
    <div ref={ref} className="relative">
      {/* Desktop: alternating left/right */}
      <div className="hidden lg:grid lg:grid-cols-[1fr_64px_1fr] lg:items-start">
        {/* Left slot */}
        <div className="pr-10 pb-10">
          {isLeft ? (
            <motion.div
              initial={{ opacity: 0, x: -50, y: 20 }}
              animate={isInView ? { opacity: 1, x: 0, y: 0 } : {}}
              transition={{ duration: 0.9, ease: easeOutCubic, delay: 0.1 }}
              className="rounded-2xl p-7 border transition-all duration-500 hover:-translate-y-1"
              style={{ ...borderStyle, ...bgStyle }}
            >
              <CardContent item={item} accentClass={accentClass} />
            </motion.div>
          ) : (
            <div />
          )}
        </div>

        {/* Center spine */}
        <div className="flex flex-col items-center">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={isInView ? { scale: 1, opacity: 1 } : {}}
            transition={{ duration: 0.6, ease: easeOutCubic, delay: 0.2 }}
            className="relative w-12 h-12 rounded-full flex items-center justify-center z-10 shrink-0 mt-2 border"
            style={{ ...borderStyle, ...iconBg }}
          >
            <motion.div
              className="absolute inset-0 rounded-full border"
              style={borderStyle}
              animate={{ scale: [1, 1.35, 1], opacity: [0.4, 0, 0.4] }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
                delay: index * 0.4,
              }}
            />
            <item.icon size={18} className={accentClass} />
          </motion.div>
          {!isLast && (
            <motion.div
              initial={{ scaleY: 0 }}
              animate={isInView ? { scaleY: 1 } : {}}
              transition={{ duration: 1.2, ease: easeOutCubic, delay: 0.4 }}
              className="w-[1px] flex-1 min-h-[80px] mt-2"
              style={{
                background: `linear-gradient(180deg, ${accentColor}40, transparent)`,
                transformOrigin: "top",
              }}
            />
          )}
        </div>

        {/* Right slot */}
        <div className="pl-10 pb-10">
          {!isLeft ? (
            <motion.div
              initial={{ opacity: 0, x: 50, y: 20 }}
              animate={isInView ? { opacity: 1, x: 0, y: 0 } : {}}
              transition={{ duration: 0.9, ease: easeOutCubic, delay: 0.1 }}
              className="rounded-2xl p-7 border transition-all duration-500 hover:-translate-y-1"
              style={{ ...borderStyle, ...bgStyle }}
            >
              <CardContent item={item} accentClass={accentClass} />
            </motion.div>
          ) : (
            <div />
          )}
        </div>
      </div>

      {/* Mobile: stacked */}
      <div className="lg:hidden flex gap-5">
        <div className="flex flex-col items-center shrink-0">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={isInView ? { scale: 1, opacity: 1 } : {}}
            transition={{ duration: 0.5, ease: easeOutCubic }}
            className="w-10 h-10 rounded-full flex items-center justify-center z-10 shrink-0 border"
            style={{ ...borderStyle, ...iconBg }}
          >
            <item.icon size={16} className={accentClass} />
          </motion.div>
          {!isLast && (
            <motion.div
              initial={{ scaleY: 0 }}
              animate={isInView ? { scaleY: 1 } : {}}
              transition={{ duration: 1, ease: easeOutCubic, delay: 0.3 }}
              className="w-[1px] flex-1 min-h-[60px] mt-2"
              style={{
                background: `linear-gradient(180deg, ${accentColor}35, transparent)`,
                transformOrigin: "top",
              }}
            />
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, x: 30, y: 15 }}
          animate={isInView ? { opacity: 1, x: 0, y: 0 } : {}}
          transition={{ duration: 0.8, ease: easeOutCubic, delay: 0.1 }}
          className="flex-1 rounded-2xl p-5 sm:p-6 border mb-6"
          style={{ ...borderStyle, ...bgStyle }}
        >
          <CardContent item={item} accentClass={accentClass} />
        </motion.div>
      </div>
    </div>
  );
}

export function WhatsIncluded() {
  const headerRef = useRef<HTMLDivElement>(null);
  const isHeaderInView = useInView(headerRef, { once: true, margin: "-60px" });

  return (
    <section className="relative z-10 py-14 sm:py-20 lg:py-28 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <div ref={headerRef} className="text-center mb-12 sm:mb-16 lg:mb-20">
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
            className="text-2xl sm:text-4xl md:text-5xl font-bold text-cream leading-tight mb-4 sm:mb-5"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Not a Course.{" "}
            <span className="text-ember">A Live Execution Environment.</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isHeaderInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, ease: easeOutCubic, delay: 0.2 }}
            className="text-base sm:text-lg text-cream/50 max-w-2xl mx-auto leading-relaxed"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            You show up. You get coached. You leave with clarity. Every single session.
          </motion.p>

          <motion.div
            initial={{ scaleX: 0 }}
            animate={isHeaderInView ? { scaleX: 1 } : {}}
            transition={{ duration: 1, delay: 0.4, ease: easeOutCubic }}
            className="w-16 h-[2px] mx-auto mt-6"
            style={{
              background:
                "linear-gradient(90deg, transparent, oklch(0.72 0.12 55), transparent)",
              transformOrigin: "center",
            }}
          />
        </div>

        {/* Timeline */}
        <div>
          {timelineItems.map((item, i) => (
            <TimelineItem
              key={item.number}
              item={item}
              index={i}
              isLast={i === timelineItems.length - 1}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
