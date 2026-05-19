import { motion, useScroll, useTransform, useInView, AnimatePresence } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import {
  ArrowRight,
  Check,
  X,
  Zap,
  Shield,
  Loader2,
  Phone,
  Calendar,
  Users,
  FileText,
  Play,
  Bot,
  MessageSquare,
  Compass,
  TrendingUp,
  ChevronDown,
  Crosshair,
TrendingDown, UsersRound, ExternalLink, Brain, BarChart3, RefreshCw, ChevronLeft, ChevronRight, ShieldCheck,
Building2, Home, Hammer, Trophy, Star, Lock, Rocket, Target, Activity, CheckCircle2, Sparkles,
} from "lucide-react";
import { useCircleCheckout } from "@/hooks/useCircleCheckout";
import { trpc } from "@/lib/trpc";

// ─── CDN Assets ────────────────────────────────────────────────────────────────

const HERO_BG =
  "/manus-storage/join-hero-marshall-office_08968f32.png";
const HERO_MOBILE =
  "/manus-storage/join-hero-mobile_c1aaf379.png";
const FINAL_CTA_BG =
  "/manus-storage/bridge-boardroom-bg_d5f13e11.png";

// ─── Easing ────────────────────────────────────────────────────────────────────

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

// ─── Data ──────────────────────────────────────────────────────────────────────

const features = [
  { icon: Phone, title: "Bi-weekly live working calls", desc: "Bring the real issue. Leave with the next move.", num: "01" },
  { icon: Calendar, title: "Monthly implementation bootcamps", desc: "Deep-dive sessions on the systems that move the business.", num: "02" },
  { icon: Users, title: "Private Discord community", desc: "Daily access to members, questions, wins, and live discussion.", num: "03" },
  { icon: FileText, title: "35+ template library", desc: "SOPs, contracts, scorecards, and frameworks built from real operating experience.", num: "04" },
  { icon: Play, title: "Replay library", desc: "Every session recorded and organized for review.", num: "05" },
  { icon: Bot, title: "AI estimating takeoff tool", desc: "Upload plans, get quantities. Built for contractors.", num: "06" },
  { icon: MessageSquare, title: "Question submission before calls", desc: "Bring the situation before the call so it can be reviewed with context.", num: "07" },
  { icon: Compass, title: "Direct strategic guidance from Marshall", desc: "$2.5B+ in construction experience applied to your business live.", num: "08" },
];

const painPoints = [
  "Bad estimates still leak margin.",
  "People issues still stay vague.",
  "Referrals are still not a system.",
  "Processes still live in your head.",
  "Growth still depends too heavily on you.",
  "The same issues keep returning every week.",
];

const painPointsData = [
  { num: "01", title: "Bad estimates still leak margin.", desc: "Every missed detail costs you money.", icon: TrendingDown, color: "oklch(0.65 0.15 25)" },
  { num: "02", title: "People issues still stay vague.", desc: "Without clarity, accountability disappears.", icon: UsersRound, color: "oklch(0.72 0.12 55)" },
  { num: "03", title: "Referrals are still not a system.", desc: "Opportunities slip through the cracks.", icon: ExternalLink, color: "oklch(0.65 0.15 145)" },
  { num: "04", title: "Processes still live in your head.", desc: "You're the bottleneck for every decision.", icon: Brain, color: "oklch(0.72 0.12 55)", highlight: true },
  { num: "05", title: "Growth still depends too heavily on you.", desc: "Your time is limited. The business isn't.", icon: BarChart3, color: "oklch(0.65 0.15 25)" },
  { num: "06", title: "The same issues keep returning every week.", desc: "Without a system, nothing truly changes.", icon: RefreshCw, color: "oklch(0.65 0.12 220)" },
];


const proofCards = [
  { company: "CNY Group", before: "$600K", after: "$20M", multiplier: "33×", period: "18 Months" },
  { company: "Trojan Roofing", before: "$300K", after: "$10M", multiplier: "33×", period: "First Year" },
  { company: "Davis Contracting", before: "$1M", after: "$4M", multiplier: "4×", period: "6 Months" },
  { company: "Sage Construction", before: "$0", after: "$2M", multiplier: "∞", period: "1 Year" },
  { company: "ARC Construction Group", before: "$0", after: "$2M", multiplier: "∞", period: "1 Year" },
];

const testimonials = [
  {
    quote:
      "Marshall's classes are one of a kind. He teaches lessons that would take you YEARS to learn yourself. Within the week I had already seen noticeable changes not only in my business but how I carried myself as a professional.",
    name: "Olive Tree Builds",
  },
  {
    quote:
      "I followed Marshall for about a year, and have been involved in other groups. There is NOTHING like Marshall. This is real world stuff here. My 2nd month as a Contractor and I'm at a quarter million in revenue and have a real scalable business.",
    name: "Sage Construction",
  },
  {
    quote:
      "ALP is Super Impactful! I have tried many other coaching programs and Coaches, and none compare to what I've learned in the past 2 months. So if you are really serious about winning in Business and life. Join ALP!",
    name: "Davis Contracting",
  },
];

const comparisonRows = [
  { passive: "Watch content alone", passiveSub: "No real-world context", circle: "Bring real problems into the room", circleSub: "Get feedback from proven operators" },
  { passive: "Take notes", passiveSub: "But rarely take action", circle: "Get decisions pressure-tested", circleSub: "Make the right call with confidence" },
  { passive: "Generic advice", passiveSub: "One-size-fits-none", circle: "Contractor-specific implementation", circleSub: "Done-for-you frameworks + systems" },
  { passive: "No accountability", passiveSub: "No one pushing you", circle: "Live rhythm, community, and follow-through", circleSub: "You'll never do it alone again" },
  { passive: "Theory", passiveSub: "Stays in your head", circle: "$2.5B construction perspective", circleSub: "Lessons from the biggest in the game" },
  { passive: "Hope for results", passiveSub: "And hope it works out", circle: "Results you can measure", circleSub: "More profit, better teams, bigger impact" },
];

const forYou = [
  "You want better estimating discipline",
  "You want systems, not scattered tactics",
  "You want direct access to Marshall's thinking",
  "You want a serious contractor room",
  "You are actively trying to scale",
];

const notForYou = [
  "You want passive content only",
  "You avoid pressure",
  "You want shortcuts",
  "You are unwilling to implement",
  "You prefer to stay in your comfort zone",
];

const objections = [
  {
    q: "I can't afford $497/month.",
    a: "One better estimate on a meaningful job can pay for years of membership.",
  },
  {
    q: "I don't have time.",
    a: "You do not have time because you do not have a system.",
  },
  {
    q: "We're too small for structure.",
    a: "Small teams need structure more, not less, because every mistake is expensive.",
  },
  {
    q: "We get work from referrals.",
    a: "Referrals are valuable. They are not a system.",
  },
  {
    q: "I've tried coaching before.",
    a: "This is not theory from a business coach. This is construction operating experience applied live.",
  },
];

const pricingIncludes = [
  "Bi-weekly live working calls",
  "Monthly implementation bootcamps",
  "Private Discord community",
  "Template / SOP library",
  "Replay library",
  "AI takeoff tool",
  "Question submission",
  "Founding rate locked while active",
];

// Ticker data (duplicated for seamless loop)
const tickerItems = [
  { name: "CNY Group", result: "$600K → $20M in 18 months" },
  { name: "Trojan Roofing", result: "$300K → $10M first year" },
  { name: "Sage Construction", result: "$2M revenue — 1st year as contractor" },
  { name: "Davis Contracting", result: "$1M → $4M in 6 months" },
  { name: "ALP Members", result: "$2.5B+ in construction experience behind every call" },
  { name: "CNY Group", result: "$600K → $20M in 18 months" },
  { name: "Trojan Roofing", result: "$300K → $10M first year" },
  { name: "Sage Construction", result: "$2M revenue — 1st year as contractor" },
  { name: "Davis Contracting", result: "$1M → $4M in 6 months" },
  { name: "ALP Members", result: "$2.5B+ in construction experience behind every call" },
];

// ─── Animated Word Reveal ──────────────────────────────────────────────────────

function AnimatedWords({
  text,
  className,
  delay = 0,
  style,
}: {
  text: string;
  className?: string;
  delay?: number;
  style?: React.CSSProperties;
}) {
  const words = text.split(" ");
  return (
    <span className={className} style={style}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 48, rotateX: 50 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{
            duration: 0.75,
            delay: delay + i * 0.09,
            ease,
          }}
          className="inline-block mr-[0.22em]"
          style={{ perspective: "800px" }}
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
}

// ─── Animated Counter ──────────────────────────────────────────────────────────

function AnimatedCounter({ target, prefix = "", suffix = "", duration = 2 }: {
  target: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const step = target / (duration * 60);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [isInView, target, duration]);

  return (
    <span ref={ref}>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
}

// ─── Transformation Ticker ─────────────────────────────────────────────────────

function TransformationTicker() {
  return (
    <div className="relative overflow-hidden w-full py-3.5 border-y border-cream/[0.06]">
      <div
        className="absolute left-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
        style={{ background: "linear-gradient(90deg, oklch(0.10 0.01 270), transparent)" }}
      />
      <div
        className="absolute right-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
        style={{ background: "linear-gradient(-90deg, oklch(0.10 0.01 270), transparent)" }}
      />
      <motion.div
        className="flex gap-0 whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 28, ease: "linear", repeat: Infinity }}
      >
        {tickerItems.map((t, i) => (
          <span key={i} className="inline-flex items-center gap-3 px-8">
            <span
              className="text-xs font-semibold text-ember/80 tracking-wide"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              {t.name}
            </span>
            <span className="text-cream/20 text-xs">—</span>
            <span
              className="text-xs text-cream/50"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {t.result}
            </span>
            <span className="text-ember/20 text-base ml-4">◆</span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}

// ─── CTA Button ────────────────────────────────────────────────────────────────

function CTAButton({
  label = "Join The Circle",
  variant = "primary",
}: {
  label?: string;
  variant?: "primary" | "outline";
}) {
  const { startCheckout, isLoading } = useCircleCheckout();

  if (variant === "outline") {
    return (
      <button
        onClick={startCheckout}
        disabled={isLoading}
        className="inline-flex items-center gap-2 px-4 py-2.5 sm:px-6 sm:py-3 sm:gap-2.5 border border-ember/30 text-ember font-semibold text-xs sm:text-sm rounded-xl hover:bg-ember/8 hover:border-ember/50 transition-all duration-300 disabled:opacity-60 cursor-pointer group"
        style={{ fontFamily: "'Sora', sans-serif" }}
      >
        {isLoading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Redirecting...
          </>
        ) : (
          <>
            {label}
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </>
        )}
      </button>
    );
  }

  return (
    <div className="relative inline-block">
      <motion.div
        className="absolute inset-0 rounded-xl blur-2xl"
        style={{ background: "oklch(0.72 0.12 55 / 0.28)" }}
        animate={{ opacity: [0.28, 0.55, 0.28] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      <button
        onClick={startCheckout}
        disabled={isLoading}
        className="relative inline-flex items-center gap-2 px-5 py-2.5 sm:px-8 sm:py-3.5 sm:gap-2.5 bg-ember hover:bg-ember-light text-midnight font-bold text-xs sm:text-sm rounded-xl transition-all duration-300 hover:scale-[1.03] shadow-[0_0_40px_oklch(0.72_0.12_55/0.25)] disabled:opacity-60 cursor-pointer group"
        style={{ fontFamily: "'Sora', sans-serif" }}
      >
        {isLoading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Redirecting to Checkout...
          </>
        ) : (
          <>
            <Zap size={18} fill="currentColor" />
            {label}
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </>
        )}
      </button>
    </div>
  );
}

// ─── Section Divider ───────────────────────────────────────────────────────────

function SectionDivider() {
  return (
    <div className="flex justify-center py-4">
      <motion.div
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, ease }}
        className="w-32 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, oklch(0.72 0.12 55 / 0.25), transparent)",
          transformOrigin: "center",
        }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: HERO — Cinematic parallax with word-by-word reveal
// ═══════════════════════════════════════════════════════════════════════════════

function getNextCallDate(): { formatted: string; iso: string } {
  // Bi-weekly Sundays at 5 PM ET, anchored to March 30, 2025 — same logic as PortalDashboard
  const ANCHOR = new Date(Date.UTC(2025, 2, 30)); // March 30, 2025 UTC (Sunday)
  const now = new Date();
  const msSinceAnchor = now.getTime() - ANCHOR.getTime();
  const daysSinceAnchor = Math.floor(msSinceAnchor / (1000 * 60 * 60 * 24));
  const cyclesPassed = daysSinceAnchor < 0 ? 0 : Math.floor(daysSinceAnchor / 14);
  const isCallDay = daysSinceAnchor >= 0 && daysSinceAnchor % 14 === 0;
  const nextCallOffset = isCallDay ? 0 : (cyclesPassed + 1) * 14;
  const nextCall = new Date(ANCHOR.getTime() + nextCallOffset * 24 * 60 * 60 * 1000);
  const formatted = nextCall.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
  return { formatted: `${formatted} \u00b7 5:00 PM ET`, iso: nextCall.toISOString().split("T")[0] };
}

function useNextCallInfo() {
  const { data } = trpc.member.getSettings.useQuery(undefined, {
    staleTime: 120_000,
    retry: false,
  });
  const settings = data?.settings || {};
  const monthFocus = settings.next_call_month_focus || "Systems & Processes \u00b7 Attention, People Process Framework";

  // Use the bi-weekly cycle calculation (same as portal dashboard)
  const { formatted } = getNextCallDate();

  return { formattedDate: formatted, monthFocus };
}

function HeroSection() {
  const { formattedDate, monthFocus } = useNextCallInfo();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const imageScale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);
  const imageY = useTransform(scrollYProgress, [0, 1], [0, 60]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 1]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, -40]);

  const scrollToProgram = () => {
    document.getElementById("what-you-get")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section ref={ref} className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Parallax background — desktop landscape */}
      <motion.div className="absolute inset-0 z-0 hidden sm:block" style={{ scale: imageScale, y: imageY }}>
        <img
          src={HERO_BG}
          alt="Marshall Wilkinson in The Contractor Circle office"
          className="w-full h-full object-cover"
          style={{ objectPosition: "65% center" }}
        />
      </motion.div>

      {/* Parallax background — mobile portrait 9:16 */}
      <motion.div className="absolute inset-0 z-0 sm:hidden" style={{ scale: imageScale, y: imageY }}>
        <img
          src={HERO_MOBILE}
          alt="Marshall Wilkinson in The Contractor Circle office"
          className="w-full h-full object-cover"
          style={{ objectPosition: "center 30%" }}
        />
      </motion.div>

      {/* Directional gradient — desktop: dark left → transparent right */}
      <motion.div
        className="absolute inset-0 z-[1] hidden sm:block"
        style={{
          opacity: overlayOpacity,
          background: `linear-gradient(105deg,
            oklch(0.08 0.01 270 / 0.92) 0%,
            oklch(0.08 0.01 270 / 0.88) 20%,
            oklch(0.08 0.01 270 / 0.72) 40%,
            oklch(0.08 0.01 270 / 0.45) 60%,
            oklch(0.08 0.01 270 / 0.22) 80%,
            oklch(0.08 0.01 270 / 0.15) 100%
          )`,
        }}
      />

      {/* Mobile gradient — bottom-heavy for text readability, lighter at top to show Marshall + logo */}
      <motion.div
        className="absolute inset-0 z-[1] sm:hidden"
        style={{
          opacity: overlayOpacity,
          background: `linear-gradient(180deg,
            oklch(0.08 0.01 270 / 0.15) 0%,
            oklch(0.08 0.01 270 / 0.25) 25%,
            oklch(0.08 0.01 270 / 0.55) 45%,
            oklch(0.08 0.01 270 / 0.82) 65%,
            oklch(0.08 0.01 270 / 0.92) 80%,
            oklch(0.08 0.01 270 / 0.96) 100%
          )`,
        }}
      />

      {/* Bottom gradient for text readability */}
      <div
        className="absolute inset-x-0 bottom-0 h-48 z-[1]"
        style={{
          background: "linear-gradient(to top, oklch(0.08 0.01 270 / 0.95), transparent)",
        }}
      />

      {/* Subtle vignette */}
      <div
        className="absolute inset-0 z-[2] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 70% 40%, transparent 40%, oklch(0.08 0.01 270 / 0.35) 100%)",
        }}
      />

      {/* SVG grain */}
      <div
        className="absolute inset-0 z-[3] opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
          backgroundSize: "128px 128px",
        }}
      />

      {/* Top nav */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-5 sm:px-10 py-4 sm:py-5">
        <div className="flex items-center gap-2.5">
          <span className="text-ember font-bold text-lg tracking-tight" style={{ fontFamily: "'Sora', sans-serif" }}>
            ALP
          </span>
          <span className="text-cream/25 text-sm hidden sm:inline">|</span>
          <span className="text-cream/55 text-sm hidden sm:inline" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Contractor Circle
          </span>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/constructline"
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-cream/50 hover:text-ember text-sm font-medium transition-colors"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            ConstructLine
          </a>
          <a
            href="https://app.alpcontractorcircle.com/login"
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-cream/20 bg-cream/5 hover:border-ember/50 hover:bg-ember/10 transition-all duration-300 text-cream/75 hover:text-cream text-sm font-medium backdrop-blur-sm"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Member Login
            <ArrowRight size={13} />
          </a>
        </div>
      </div>

      {/* ═══ DESKTOP CONTENT — left-aligned advisory layout ═══ */}
      <motion.div
        style={{ y: contentY }}
        className="relative z-10 flex-1 hidden sm:flex flex-col justify-center px-10 lg:px-16 pt-32 pb-16 max-w-[58%] lg:max-w-[50%]"
      >
        {/* Eyebrow badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease, delay: 0.15 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-ember/25 bg-ember/[0.06] mb-8 w-fit"
        >
          <Zap size={11} className="text-ember/80" fill="currentColor" />
          <span
            className="text-[10px] font-semibold tracking-[0.18em] uppercase text-ember/80"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            The Contractor Circle
          </span>
        </motion.div>

        {/* Headline */}
        <h1
          className="text-4xl md:text-[2.8rem] lg:text-[3.4rem] font-bold leading-[1.08] tracking-tight mb-6"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          <AnimatedWords text="Build the" className="text-[#F5F0E8]" delay={0.3} />
          <br />
          <AnimatedWords text="operating system" className="text-ember" delay={0.55} />
          <br />
          <AnimatedWords text="your contracting" className="text-[#F5F0E8]" delay={0.8} />
          <br />
          <AnimatedWords text="business is missing." className="text-[#F5F0E8]" delay={1.0} />
        </h1>

        {/* Subtle divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.2, delay: 1.35, ease }}
          className="w-16 h-[1.5px] mb-6"
          style={{
            background: "linear-gradient(90deg, oklch(0.72 0.12 55), oklch(0.72 0.12 55 / 0.2))",
            transformOrigin: "left",
          }}
        />

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease, delay: 1.2 }}
          className="text-base lg:text-lg text-cream/65 font-light leading-relaxed mb-8 max-w-lg"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Marshall Wilkinson's private implementation environment for contractors who want sharper
          decisions, cleaner systems, and a business that no longer depends on guesswork.
        </motion.p>

        {/* Dual CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease, delay: 1.45 }}
          className="flex flex-row items-start gap-3 mb-5"
        >
          <CTAButton label="Join The Circle" />
          <button
            onClick={scrollToProgram}
            className="inline-flex items-center gap-2 px-6 py-4 text-cream/60 hover:text-cream font-medium text-sm transition-all duration-300 group"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Explore the Program
            <ChevronDown size={15} className="group-hover:translate-y-0.5 transition-transform" />
          </button>
        </motion.div>

        {/* Microcopy */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.7, duration: 0.8 }}
          className="text-[11px] text-cream/25 mb-8"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          $497/mo · Founding rate locked while active · Cancel anytime
        </motion.p>

        {/* Credibility bar */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.85, duration: 0.8, ease }}
          className="flex flex-wrap items-center gap-x-4 gap-y-1.5"
        >
          {["Strategy", "Sales Process", "Project Delivery", "Financial Control"].map((item, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span className="text-ember/30 text-[8px]">·</span>}
              <span
                className="text-xs tracking-[0.08em] uppercase text-cream/35 font-medium"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                {item}
              </span>
            </span>
          ))}
        </motion.div>
      </motion.div>

      {/* ═══ MOBILE CONTENT — full-width, bottom-anchored over portrait image ═══ */}
      <motion.div
        style={{ y: contentY }}
        className="relative z-10 flex-1 flex sm:hidden flex-col justify-end px-5 pt-20 pb-6"
      >
        {/* Eyebrow badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease, delay: 0.15 }}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-ember/25 bg-ember/[0.06] mb-3 w-fit"
        >
          <Zap size={9} className="text-ember/80" fill="currentColor" />
          <span
            className="text-[8px] font-semibold tracking-[0.18em] uppercase text-ember/80"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            The Contractor Circle
          </span>
        </motion.div>

        {/* Headline — mobile: "missing." in gold */}
        <h1
          className="text-[1.55rem] font-bold leading-[1.14] tracking-tight mb-3"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          <AnimatedWords text="Build the" className="text-[#F5F0E8]" delay={0.3} />{" "}<AnimatedWords text="operating" className="text-ember" delay={0.5} /><br />
          <AnimatedWords text="system" className="text-ember" delay={0.6} />{" "}<AnimatedWords text="your contracting" className="text-[#F5F0E8]" delay={0.7} /><br />
          <AnimatedWords text="business is" className="text-[#F5F0E8]" delay={0.85} />{" "}<AnimatedWords text="missing." className="text-ember" delay={0.95} />
        </h1>

        {/* Subtle divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.2, delay: 1.1, ease }}
          className="w-10 h-[1px] mb-3"
          style={{
            background: "linear-gradient(90deg, oklch(0.72 0.12 55), oklch(0.72 0.12 55 / 0.2))",
            transformOrigin: "left",
          }}
        />

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease, delay: 1.0 }}
          className="text-[12px] text-cream/55 font-light leading-relaxed mb-4 max-w-[85%]"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Marshall Wilkinson's private implementation environment for contractors who want sharper
          decisions, better systems, and a business that does not depend on guesswork.
        </motion.p>

        {/* Primary CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease, delay: 1.2 }}
          className="mb-2.5"
        >
          <CTAButton label="Join The Circle" />
        </motion.div>

        {/* Secondary CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease, delay: 1.35 }}
          className="mb-4"
        >
          <button
            onClick={scrollToProgram}
            className="inline-flex items-center gap-2 px-5 py-2.5 border border-cream/12 text-cream/55 hover:text-cream font-medium text-xs rounded-lg transition-all duration-300 group"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            See What's Inside
            <ChevronDown size={14} className="group-hover:translate-y-0.5 transition-transform" />
          </button>
        </motion.div>

        {/* ─── Next Live Call card — compact, premium glass ─── */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.55, duration: 0.9, ease }}
          className="mb-4"
        >
          <div
            className="px-3.5 py-3 rounded-lg backdrop-blur-md"
            style={{
              background: "linear-gradient(135deg, oklch(0.10 0.01 270 / 0.55), oklch(0.08 0.01 270 / 0.35))",
              borderTop: "1.5px solid oklch(0.72 0.12 55 / 0.3)",
              borderLeft: "1px solid oklch(1 0 0 / 0.04)",
              borderRight: "1px solid oklch(1 0 0 / 0.04)",
              borderBottom: "1px solid oklch(1 0 0 / 0.04)",
              boxShadow: "0 2px 16px oklch(0 0 0 / 0.2)",
            }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span
                className="text-[8px] tracking-[0.14em] uppercase text-cream/40 font-semibold"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                Next Live Call
              </span>
            </div>
            <p
              className="text-[13px] text-[#F5F0E8]/75 font-medium mb-1"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {formattedDate}
            </p>
            <p
              className="text-[10px] text-cream/30 leading-relaxed"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {monthFocus}
            </p>
          </div>
        </motion.div>

        {/* Icon/value row — compact, single line */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.75, duration: 0.8, ease }}
          className="flex items-center justify-between gap-1 px-0"
        >
          {[
            { label: "Live Coaching" },
            { label: "Systems" },
            { label: "Network" },
            { label: "Support" },
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center flex-1">
              <span
                className="text-[7px] tracking-[0.08em] uppercase text-cream/25 font-medium text-center leading-tight"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                {item.label}
              </span>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Floating glass card — desktop only, lower right */}
      <motion.div
        initial={{ opacity: 0, y: 30, x: 20 }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        transition={{ delay: 2.2, duration: 1.2, ease }}
        className="absolute bottom-28 right-8 sm:right-12 lg:right-16 z-10 hidden md:block"
      >
        <div
          className="px-5 py-4 rounded-xl border border-cream/[0.08] backdrop-blur-md"
          style={{
            background: "linear-gradient(135deg, oklch(0.12 0.01 270 / 0.55), oklch(0.10 0.01 270 / 0.35))",
            boxShadow: "0 8px 32px oklch(0 0 0 / 0.3), inset 0 1px 0 oklch(1 0 0 / 0.04)",
          }}
        >
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span
              className="text-[9px] tracking-[0.15em] uppercase text-cream/40 font-semibold"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Next Live Call
            </span>
          </div>
          <p
            className="text-sm text-cream/75 font-medium mb-3"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {formattedDate}
          </p>
          <div className="border-t border-cream/[0.06] pt-2.5">
            <span
              className="text-[9px] tracking-[0.12em] uppercase text-cream/30 font-semibold"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              This Month's Focus
            </span>
            <p
              className="text-xs text-cream/50 mt-1 leading-relaxed"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {monthFocus}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Scroll indicator — desktop only */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5, duration: 1.5 }}
        className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10 hidden sm:block"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center gap-1.5"
        >
          <span
            className="text-[9px] tracking-[0.3em] uppercase text-cream/15"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Scroll
          </span>
          <div className="w-[1px] h-6 bg-gradient-to-b from-cream/15 to-transparent" />
        </motion.div>
      </motion.div>

      {/* Transformation ticker at bottom */}
      <div className="relative z-10 mt-auto">
        <TransformationTicker />
      </div>
    </section>
  );
}

// SECTION 2: BRIDGE — Editorial pull-quote style
function BridgeSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-60px" });
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 0.9", "end 0.1"],
  });

  // Scroll-linked transforms for pillar cards
  const pillarX1 = useTransform(scrollYProgress, [0, 0.25], [120, 0]);
  const pillarX2 = useTransform(scrollYProgress, [0.03, 0.3], [150, 0]);
  const pillarX3 = useTransform(scrollYProgress, [0.06, 0.35], [180, 0]);
  const pillarX4 = useTransform(scrollYProgress, [0.09, 0.4], [210, 0]);
  const pillarX5 = useTransform(scrollYProgress, [0.12, 0.45], [240, 0]);
  const pillarXValues = [pillarX1, pillarX2, pillarX3, pillarX4, pillarX5];

  const pillarOpacity1 = useTransform(scrollYProgress, [0, 0.2], [0, 1]);
  const pillarOpacity2 = useTransform(scrollYProgress, [0.03, 0.25], [0, 1]);
  const pillarOpacity3 = useTransform(scrollYProgress, [0.06, 0.3], [0, 1]);
  const pillarOpacity4 = useTransform(scrollYProgress, [0.09, 0.35], [0, 1]);
  const pillarOpacity5 = useTransform(scrollYProgress, [0.12, 0.4], [0, 1]);
  const pillarOpacityValues = [pillarOpacity1, pillarOpacity2, pillarOpacity3, pillarOpacity4, pillarOpacity5];

  const progressWidth = useTransform(scrollYProgress, [0.1, 0.5], ["0%", "100%"]);
  const sysOpacity = useTransform(scrollYProgress, [0.35, 0.55], [0, 1]);
  const sysY = useTransform(scrollYProgress, [0.35, 0.55], [30, 0]);
  const rhythmOpacity = useTransform(scrollYProgress, [0.5, 0.65], [0, 1]);
  const rhythmY = useTransform(scrollYProgress, [0.5, 0.65], [20, 0]);
  const systemUnderlineWidth = useTransform(scrollYProgress, [0, 0.3], ["0%", "100%"]);

  // Mobile scroll-linked transforms
  const mobileHeaderY = useTransform(scrollYProgress, [0, 0.15], [40, 0]);
  const mobileHeaderOpacity = useTransform(scrollYProgress, [0, 0.15], [0, 1]);
  const mobileTextY = useTransform(scrollYProgress, [0.05, 0.2], [30, 0]);
  const mobileTextOpacity = useTransform(scrollYProgress, [0.05, 0.2], [0, 1]);
  const mobilePanelY = useTransform(scrollYProgress, [0.12, 0.35], [50, 0]);
  const mobilePanelOpacity = useTransform(scrollYProgress, [0.12, 0.35], [0, 1]);
  const mobileQuoteY = useTransform(scrollYProgress, [0.3, 0.45], [30, 0]);
  const mobileQuoteOpacity = useTransform(scrollYProgress, [0.3, 0.45], [0, 1]);

  const pillars = [
    { icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z", label: "LEAD FLOW", desc: "Generate the right opportunities.", active: false },
    { icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", label: "SALES PROCESS", desc: "Convert more leads into profitable jobs.", active: false },
    { icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4", label: "PROJECT DELIVERY", desc: "Deliver projects on time, on budget, every time.", active: true },
    { icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", label: "FINANCIAL CONTROL", desc: "Know your numbers. Increase profitability.", active: false },
    { icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6", label: "SCALE", desc: "Build a company that runs without you.", active: false },
  ];

  const systems = [
    { icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", label: "Templates" },
    { icon: "M4 6h16M4 10h16M4 14h16M4 18h16", label: "SOPs" },
    { icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", label: "Scorecards" },
    { icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", label: "Meetings" },
    { icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", label: "Accountability" },
    { icon: "M13 10V3L4 14h7v7l9-11h-7z", label: "Decisions" },
  ];

  return (
    <section ref={sectionRef} className="relative py-24 sm:py-32 lg:py-40 overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 right-1/4 w-[800px] h-[800px] bg-[radial-gradient(ellipse_at_center,rgba(232,135,12,0.06)_0%,transparent_60%)]" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#1f1f1f] to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-6 sm:px-10 relative z-10">
        {/* DESKTOP LAYOUT (lg+) */}
        <div className="hidden lg:grid lg:grid-cols-2 gap-12 items-start">
          {/* LEFT COLUMN */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-[#e8870c] mb-6">From Tool to System</p>
            <div className="w-12 h-[2px] bg-gradient-to-r from-[#e8870c] to-transparent mb-8" />
            <h2 className="text-[3.4rem] font-bold leading-[1.1] tracking-tight mb-10">
              <span className="text-[#f5f0e8]">A checklist can help.</span><br />
              <span className="text-[#f5f0e8]">A </span>
              <span className="relative inline-block">
                <span className="text-[#e8870c] font-extrabold">system</span>
                <motion.span className="absolute -bottom-2 left-0 h-[4px] bg-gradient-to-r from-[#e8870c] via-[#f5a623] to-[#e8870c] rounded-full" style={{ width: systemUnderlineWidth }} />
              </span>
              <span className="text-[#f5f0e8]"> changes</span><br />
              <span className="text-[#f5f0e8]">the company.</span>
            </h2>
            <div className="space-y-5 text-[#a8a090] text-base leading-relaxed max-w-lg">
              <p>You may have come here through the <strong className="text-[#f5f0e8]">Estimator&apos;s Checklist</strong>, the <strong className="text-[#f5f0e8]">Q2 Framework</strong>, or the <strong className="text-[#f5f0e8]">Holy Grail of Scaling</strong>.</p>
              <p>Each one gives you a piece of the machine.</p>
              <p className="text-[#e8870c] font-bold text-lg">But a piece is not the machine.</p>
              <p>Inside Contractor Circle, those pieces get connected into a live operating rhythm: estimating, scorecards, meetings, templates, accountability, decision-making, planning, and execution.</p>
            </div>
            <motion.div className="mt-10 pl-5 border-l-2 border-[#e8870c]/60" initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.7, delay: 0.8 }}>
              <p className="italic text-[#a8a090] text-sm">This is where isolated tools become</p>
              <p className="text-[#e8870c] font-semibold text-base">a company-wide operating system.</p>
            </motion.div>
          </motion.div>

          {/* RIGHT COLUMN — Operating System Panel (Desktop) */}
          <div className="relative">
            <div className="absolute -inset-4 bg-[radial-gradient(ellipse_at_center,rgba(232,135,12,0.08)_0%,transparent_70%)] pointer-events-none rounded-3xl" />
            <div className="relative rounded-2xl border border-[#1f1f1f] bg-gradient-to-b from-[#0d0d0d] to-[#080808] p-8 shadow-2xl">
              <div className="text-center mb-8">
                <p className="text-[10px] tracking-[0.3em] uppercase text-[#6b6560] mb-2">The Contractor Circle</p>
                <h3 className="text-3xl font-bold text-[#f5f0e8] tracking-tight">OPERATING SYSTEM</h3>
                <div className="w-16 h-[2px] bg-gradient-to-r from-transparent via-[#e8870c] to-transparent mx-auto mt-3" />
              </div>
              {/* Pillar Cards */}
              <div className="relative mb-8">
                <div className="absolute top-[44px] left-[8%] right-[8%] h-[2px] bg-[#1a1a1a] z-0 rounded-full overflow-hidden">
                  <motion.div className="h-full bg-gradient-to-r from-[#e8870c] via-[#f5a623] to-[#e8870c]" style={{ width: progressWidth }} />
                </div>
                <div className="flex gap-2.5 relative z-10 justify-center">
                  {pillars.map((pillar, i) => (
                    <motion.div key={pillar.label} className={`flex flex-col items-center text-center px-2 py-5 rounded-xl flex-1 min-w-0 ${pillar.active ? "bg-gradient-to-b from-[#e8870c]/25 to-[#0d0d0d] border-2 border-[#e8870c]/70 shadow-[0_0_40px_rgba(232,135,12,0.2)]" : "bg-[#0d0d0d]/80 border border-[#1f1f1f]"}`} style={{ x: pillarXValues[i], opacity: pillarOpacityValues[i], scale: pillar.active ? 1.05 : 1 }}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2.5 ${pillar.active ? "bg-[#e8870c]/20 ring-1 ring-[#e8870c]/30" : "bg-[#1a1a1a]"}`}>
                        <svg className={`w-5 h-5 ${pillar.active ? "text-[#e8870c]" : "text-[#a8a090]"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={pillar.icon} /></svg>
                      </div>
                      <p className={`text-[8px] xl:text-[9px] font-bold tracking-wider uppercase leading-tight mb-1 ${pillar.active ? "text-[#e8870c]" : "text-[#f5f0e8]"}`}>{pillar.label}</p>
                      <p className="text-[7px] xl:text-[8px] text-[#6b6560] leading-tight hidden xl:block">{pillar.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
              <div className="h-px bg-gradient-to-r from-transparent via-[#1f1f1f] to-transparent mb-6" />
              {/* Connected Systems */}
              <motion.div className="mb-6" style={{ opacity: sysOpacity, y: sysY }}>
                <p className="text-[10px] tracking-[0.25em] uppercase text-[#6b6560] text-center mb-4 font-semibold">Powered by Connected Systems</p>
                <div className="grid grid-cols-6 gap-2">
                  {systems.map((sys) => (
                    <div key={sys.label} className="flex flex-col items-center text-center p-2.5 rounded-xl bg-[#0a0a0a] border border-[#1a1a1a] hover:border-[#e8870c]/30 transition-colors duration-300 group">
                      <div className="w-8 h-8 rounded-lg bg-[#141414] flex items-center justify-center mb-1.5 group-hover:bg-[#e8870c]/10 transition-colors">
                        <svg className="w-4 h-4 text-[#e8870c]/60 group-hover:text-[#e8870c] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={sys.icon} /></svg>
                      </div>
                      <p className="text-[8px] font-semibold text-[#a8a090] tracking-wider leading-tight">{sys.label}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
              <div className="h-px bg-gradient-to-r from-transparent via-[#1f1f1f] to-transparent mb-5" />
              {/* Rhythm Bar */}
              <motion.div className="rounded-xl border border-[#1a1a1a] bg-[#0a0a0a]/90 p-5" style={{ opacity: rhythmOpacity, y: rhythmY }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#141414] flex items-center justify-center">
                      <svg className="w-4 h-4 text-[#a8a090]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                    <span className="text-sm font-bold uppercase tracking-wider text-[#f5f0e8]">Live Implementation Rhythm</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                    <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span></span>
                    <span className="text-xs font-semibold text-green-400 uppercase tracking-wider">Active</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  {["Weekly Coaching", "Monthly Bootcamps", "Real-World Application", "Measurable Results"].map((item) => (
                    <div key={item} className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#e8870c]/60" /><span className="text-xs text-[#a8a090]">{item}</span></div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* MOBILE LAYOUT (< lg) */}
        <div className="lg:hidden">
          <motion.div style={{ y: mobileHeaderY, opacity: mobileHeaderOpacity }} className="text-center mb-10">
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-[#e8870c] mb-4">From Tool to System</p>
            <div className="w-12 h-[2px] bg-gradient-to-r from-[#e8870c] to-transparent mx-auto mb-6" />
            <h2 className="text-3xl sm:text-4xl font-bold leading-[1.1] tracking-tight mb-6">
              <span className="text-[#f5f0e8]">A checklist can help.</span><br />
              <span className="text-[#f5f0e8]">A </span><span className="text-[#e8870c] font-extrabold">system</span><span className="text-[#f5f0e8]"> changes</span><br />
              <span className="text-[#f5f0e8]">the company.</span>
            </h2>
          </motion.div>
          <motion.div style={{ y: mobileTextY, opacity: mobileTextOpacity }} className="space-y-4 text-[#a8a090] text-[15px] leading-relaxed mb-10">
            <p>You may have come here through the <strong className="text-[#f5f0e8]">Estimator&apos;s Checklist</strong>, the <strong className="text-[#f5f0e8]">Q2 Framework</strong>, or the <strong className="text-[#f5f0e8]">Holy Grail of Scaling</strong>.</p>
            <p>Each one gives you a piece of the machine.</p>
            <p className="text-[#e8870c] font-bold text-lg">But a piece is not the machine.</p>
            <p>Inside Contractor Circle, those pieces get connected into a live operating rhythm — and that rhythm is what changes the company.</p>
          </motion.div>

          {/* Mobile Operating System Panel */}
          <motion.div style={{ y: mobilePanelY, opacity: mobilePanelOpacity }} className="relative">
            <div className="absolute -inset-3 bg-[radial-gradient(ellipse_at_center,rgba(232,135,12,0.06)_0%,transparent_70%)] pointer-events-none rounded-2xl" />
            <div className="relative rounded-2xl border border-[#1f1f1f] bg-gradient-to-b from-[#0d0d0d] to-[#080808] p-5 shadow-2xl">
              <div className="text-center mb-6">
                <p className="text-[9px] tracking-[0.3em] uppercase text-[#6b6560] mb-1.5">The Contractor Circle</p>
                <h3 className="text-xl font-bold text-[#f5f0e8] tracking-tight">OPERATING SYSTEM</h3>
                <div className="w-12 h-[2px] bg-gradient-to-r from-transparent via-[#e8870c] to-transparent mx-auto mt-2" />
              </div>

              {/* Featured: Project Delivery */}
              <div className="mb-3 p-4 rounded-xl bg-gradient-to-b from-[#e8870c]/20 to-[#0d0d0d] border-2 border-[#e8870c]/60 shadow-[0_0_30px_rgba(232,135,12,0.15)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#e8870c]/20 ring-1 ring-[#e8870c]/30 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-[#e8870c]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                  </div>
                  <div>
                    <p className="text-xs font-bold tracking-wider uppercase text-[#e8870c]">Project Delivery</p>
                    <p className="text-[11px] text-[#a8a090] mt-0.5">Deliver projects on time, on budget, every time.</p>
                  </div>
                </div>
              </div>

              {/* Other 4 pillars in 2x2 grid */}
              <div className="grid grid-cols-2 gap-2.5 mb-5">
                {pillars.filter(p => !p.active).map((pillar) => (
                  <div key={pillar.label} className="flex flex-col items-center text-center p-3 rounded-xl bg-[#0d0d0d]/80 border border-[#1f1f1f]">
                    <div className="w-9 h-9 rounded-lg bg-[#1a1a1a] flex items-center justify-center mb-2">
                      <svg className="w-4 h-4 text-[#a8a090]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={pillar.icon} /></svg>
                    </div>
                    <p className="text-[10px] font-bold tracking-wider uppercase text-[#f5f0e8] leading-tight">{pillar.label}</p>
                  </div>
                ))}
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-[#1f1f1f] to-transparent mb-5" />

              {/* Mobile Connected Systems — 3x2 grid */}
              <div className="mb-5">
                <p className="text-[9px] tracking-[0.25em] uppercase text-[#6b6560] text-center mb-3 font-semibold">Connected Systems</p>
                <div className="grid grid-cols-3 gap-2">
                  {systems.map((sys) => (
                    <div key={sys.label} className="flex flex-col items-center text-center p-2.5 rounded-lg bg-[#0a0a0a] border border-[#1a1a1a]">
                      <div className="w-7 h-7 rounded-md bg-[#141414] flex items-center justify-center mb-1.5">
                        <svg className="w-3.5 h-3.5 text-[#e8870c]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={sys.icon} /></svg>
                      </div>
                      <p className="text-[9px] font-semibold text-[#a8a090] leading-tight">{sys.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-[#1f1f1f] to-transparent mb-4" />

              {/* Mobile Rhythm Bar */}
              <div className="rounded-lg border border-[#1a1a1a] bg-[#0a0a0a]/90 p-3.5">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#f5f0e8]">Live Implementation Rhythm</span>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
                    <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span></span>
                    <span className="text-[9px] font-semibold text-green-400 uppercase">Active</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                  {["Weekly Coaching", "Monthly Bootcamps", "Real-World Application", "Measurable Results"].map((item) => (
                    <div key={item} className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-[#e8870c]/60" /><span className="text-[10px] text-[#a8a090]">{item}</span></div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Mobile closing quote */}
          <motion.div className="mt-8 pl-4 border-l-2 border-[#e8870c]/60" style={{ y: mobileQuoteY, opacity: mobileQuoteOpacity }}>
            <p className="italic text-[#a8a090] text-sm">This is where isolated tools become</p>
            <p className="text-[#e8870c] font-semibold text-base">a company-wide operating system.</p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}



// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: WHAT THE CIRCLE IS — Glass cards with numbered badges
// ═══════════════════════════════════════════════════════════════════════════════

function ScrollCard({ children, index, scrollYProgress, className, style: extraStyle }: {
  children: React.ReactNode;
  index: number;
  scrollYProgress: import("framer-motion").MotionValue<number>;
  className?: string;
  style?: React.CSSProperties;
}) {
  // Each card gets a staggered window within the scroll progress
  // Row 1 (0-3): animate between 0.15-0.45, Row 2 (4-7): animate between 0.35-0.65
  const row = index < 4 ? 0 : 1;
  const colInRow = index % 4;
  const baseStart = row === 0 ? 0.12 : 0.32;
  const stagger = colInRow * 0.04;
  const start = baseStart + stagger;
  const end = start + 0.18;

  const y = useTransform(scrollYProgress, [start, end], [60, 0]);
  const opacity = useTransform(scrollYProgress, [start, end], [0, 1]);
  const scale = useTransform(scrollYProgress, [start, end], [0.92, 1]);

  return (
    <motion.div className={className} style={{ y, opacity, scale, ...extraStyle }}>
      {children}
    </motion.div>
  );
}

function WhatIsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.3"] });

  // Header: fades in first as section enters
  const headerY = useTransform(scrollYProgress, [0, 0.12], [50, 0]);
  const headerOpacity = useTransform(scrollYProgress, [0, 0.12], [0, 1]);

  // ONE GOAL bar: after cards
  const goalY = useTransform(scrollYProgress, [0.55, 0.72], [40, 0]);
  const goalOpacity = useTransform(scrollYProgress, [0.55, 0.72], [0, 1]);

  // Tagline bar: last element
  const taglineY = useTransform(scrollYProgress, [0.68, 0.82], [30, 0]);
  const taglineOpacity = useTransform(scrollYProgress, [0.68, 0.82], [0, 1]);

  // Color palette for each card's icon ring
  const cardColors = [
    { ring: "oklch(0.72 0.12 55)", bg: "oklch(0.72 0.12 55 / 0.08)" },   // 01 ember/gold
    { ring: "oklch(0.65 0.12 220)", bg: "oklch(0.65 0.12 220 / 0.08)" },  // 02 teal
    { ring: "oklch(0.65 0.15 145)", bg: "oklch(0.65 0.15 145 / 0.08)" },  // 03 green
    { ring: "oklch(0.65 0.12 300)", bg: "oklch(0.65 0.12 300 / 0.08)" },  // 04 purple
    { ring: "oklch(0.65 0.15 25)", bg: "oklch(0.65 0.15 25 / 0.08)" },    // 05 red/coral
    { ring: "oklch(0.65 0.12 200)", bg: "oklch(0.65 0.12 200 / 0.08)" },  // 06 cyan
    { ring: "oklch(0.65 0.10 230)", bg: "oklch(0.65 0.10 230 / 0.08)" },  // 07 steel blue
    { ring: "oklch(0.72 0.12 55)", bg: "oklch(0.72 0.12 55 / 0.08)" },    // 08 ember/gold
  ];

  return (
    <section ref={ref} id="what-you-get" className="relative py-24 sm:py-32 px-6">
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 50% 20%, oklch(0.72 0.12 55 / 0.04), transparent 60%)",
        }}
      />
      <div className="max-w-6xl mx-auto relative">
        {/* Header — scroll-linked */}
        <motion.div
          style={{ y: headerY, opacity: headerOpacity }}
          className="text-center mb-6"
        >
          <p
            className="text-xs font-semibold uppercase text-ember mb-4 tracking-[0.2em]"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            What You Get
          </p>
          <div className="w-12 h-0.5 bg-ember mx-auto mb-6" />
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-cream leading-tight"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            This is not a course.
            <br />
            It is a{" "}
            <span className="italic" style={{ background: "linear-gradient(90deg, oklch(0.72 0.12 55), oklch(0.8 0.1 70))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              live implementation room.
            </span>
          </h2>
        </motion.div>

        {/* Subheadline — scroll-linked */}
        <motion.p
          style={{ opacity: headerOpacity, fontFamily: "'DM Sans', sans-serif" }}
          className="text-center text-cream/50 text-sm sm:text-base max-w-xl mx-auto mb-16 leading-relaxed"
        >
          Real problems. Real answers. Real results.
          <br />
          Everything inside Contractor Circle is built to help your business run sharper, cleaner, and more profitable.
        </motion.p>

        {/* 4x2 Feature Grid — Desktop: scroll-linked stagger */}
        <div className="hidden sm:grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {features.map((f, i) => {
            const color = cardColors[i];
            return (
              <ScrollCard
                key={i}
                index={i}
                scrollYProgress={scrollYProgress}
                className="relative p-5 sm:p-6 rounded-xl overflow-hidden text-center"
                style={{
                  background: "oklch(0.15 0.01 250 / 0.6)",
                  border: `1px solid oklch(1 0 0 / 0.06)`,
                }}
              >
                {/* Number */}
                <span
                  className="text-xs font-bold tracking-[0.15em] mb-4 block text-left"
                  style={{ fontFamily: "'Sora', sans-serif", color: color.ring }}
                >
                  {f.num}
                </span>
                {/* Icon with colored ring */}
                <div
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{
                    border: `2px solid ${color.ring}`,
                    background: color.bg,
                  }}
                >
                  <f.icon size={24} style={{ color: color.ring }} />
                </div>
                {/* Title */}
                <h3
                  className="text-sm sm:text-base font-bold text-cream mb-3 leading-snug"
                  style={{ fontFamily: "'Sora', sans-serif" }}
                >
                  {f.title}
                </h3>
                {/* Divider */}
                <div className="w-8 h-0.5 mx-auto mb-3" style={{ background: color.ring, opacity: 0.4 }} />
                {/* Description */}
                <p
                  className="text-xs sm:text-sm text-cream/45 leading-relaxed"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {f.desc}
                </p>
              </ScrollCard>
            );
          })}
        </div>

        {/* 2-column Feature Grid — Mobile: scroll-linked stagger */}
        <div className="grid grid-cols-2 gap-3 sm:hidden mb-8">
          {features.map((f, i) => {
            const color = cardColors[i];
            // Mobile: 4 rows of 2, stagger by row
            const mobileRow = Math.floor(i / 2);
            const mobileCol = i % 2;
            const mStart = 0.12 + mobileRow * 0.1 + mobileCol * 0.03;
            const mEnd = mStart + 0.15;
            return (
              <ScrollCard
                key={i}
                index={i}
                scrollYProgress={scrollYProgress}
                className="relative p-4 rounded-xl overflow-hidden text-center"
                style={{
                  background: "oklch(0.15 0.01 250 / 0.6)",
                  border: `1px solid oklch(1 0 0 / 0.06)`,
                }}
              >
                {/* Number */}
                <span
                  className="text-[10px] font-bold tracking-[0.15em] mb-3 block text-left"
                  style={{ fontFamily: "'Sora', sans-serif", color: color.ring }}
                >
                  {f.num}
                </span>
                {/* Icon with colored ring */}
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                  style={{
                    border: `2px solid ${color.ring}`,
                    background: color.bg,
                  }}
                >
                  <f.icon size={20} style={{ color: color.ring }} />
                </div>
                {/* Title */}
                <h3
                  className="text-xs font-bold text-cream mb-2 leading-snug"
                  style={{ fontFamily: "'Sora', sans-serif" }}
                >
                  {f.title}
                </h3>
                {/* Divider */}
                <div className="w-6 h-0.5 mx-auto mb-2" style={{ background: color.ring, opacity: 0.4 }} />
                {/* Description */}
                <p
                  className="text-[10px] text-cream/45 leading-relaxed"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {f.desc}
                </p>
              </ScrollCard>
            );
          })}
        </div>

        {/* ONE GOAL Summary Bar — scroll-linked */}
        <motion.div
          style={{ y: goalY, opacity: goalOpacity, background: "oklch(0.15 0.01 250 / 0.6)", border: "1px solid oklch(0.72 0.12 55 / 0.15)" }}
          className="rounded-xl p-5 sm:p-6 mb-4 flex flex-col sm:flex-row items-center gap-6"
        >
          {/* Left: Goal statement */}
          <div className="flex items-center gap-4 sm:flex-1">
            <div
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: "oklch(0.72 0.12 55 / 0.12)",
                border: "1px solid oklch(0.72 0.12 55 / 0.25)",
              }}
            >
              <Crosshair size={28} className="text-ember" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-ember mb-1" style={{ fontFamily: "'Sora', sans-serif" }}>
                One Goal:
              </p>
              <p className="text-base sm:text-lg font-bold text-cream leading-snug" style={{ fontFamily: "'Sora', sans-serif" }}>
                Build a company that runs{" "}
                <span className="text-ember">without you.</span>
              </p>
            </div>
          </div>
          {/* Right: Stats */}
          <div className="flex items-center gap-6 sm:gap-8">
            <div className="text-center">
              <p className="text-lg sm:text-xl font-bold text-ember" style={{ fontFamily: "'Sora', sans-serif" }}>$2.5B+</p>
              <p className="text-[10px] text-cream/40" style={{ fontFamily: "'DM Sans', sans-serif" }}>in construction<br/>experience</p>
            </div>
            <div className="w-px h-10 bg-cream/10" />
            <div className="text-center">
              <p className="text-lg sm:text-xl font-bold text-ember" style={{ fontFamily: "'Sora', sans-serif" }}>Hundreds</p>
              <p className="text-[10px] text-cream/40" style={{ fontFamily: "'DM Sans', sans-serif" }}>of contractors<br/>helped</p>
            </div>
            <div className="w-px h-10 bg-cream/10" />
            <div className="text-center">
              <p className="text-lg sm:text-xl font-bold text-ember" style={{ fontFamily: "'Sora', sans-serif" }}>Proven</p>
              <p className="text-[10px] text-cream/40" style={{ fontFamily: "'DM Sans', sans-serif" }}>systems. Real<br/>world results.</p>
            </div>
          </div>
        </motion.div>

        {/* Built in the Field Tagline Bar — scroll-linked */}
        <motion.div
          style={{ y: taglineY, opacity: taglineOpacity, background: "oklch(0.15 0.01 250 / 0.6)", border: "1px solid oklch(1 0 0 / 0.06)" }}
          className="rounded-xl p-4 sm:p-5 flex items-center gap-4"
        >
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: "oklch(0.72 0.12 55 / 0.1)",
              border: "1px solid oklch(0.72 0.12 55 / 0.2)",
            }}
          >
            <Calendar size={18} className="text-ember" />
          </div>
          <div>
            <p className="text-xs sm:text-sm text-cream/50 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              This is not theory. This is what works right now.
            </p>
            <p className="text-xs sm:text-sm font-bold text-cream leading-relaxed" style={{ fontFamily: "'Sora', sans-serif" }}>
              Built in the field. Tested in the real world. Implemented with you.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: WHY NOW — Cost of Waiting with numbered pain-point cards
// ═══════════════════════════════════════════════════════════════════════════════

function WhyNowSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.3"] });

  // Header
  const headerY = useTransform(scrollYProgress, [0, 0.12], [50, 0]);
  const headerOpacity = useTransform(scrollYProgress, [0, 0.12], [0, 1]);

  // CTA bar
  const ctaY = useTransform(scrollYProgress, [0.65, 0.8], [40, 0]);
  const ctaOpacity = useTransform(scrollYProgress, [0.65, 0.8], [0, 1]);

  // Closing message
  const closeY = useTransform(scrollYProgress, [0.75, 0.88], [30, 0]);
  const closeOpacity = useTransform(scrollYProgress, [0.75, 0.88], [0, 1]);

  // Card colors for desktop grid
  const cardColors = [
    "oklch(0.65 0.15 25)",    // 01 red/coral
    "oklch(0.72 0.12 55)",    // 02 ember/gold
    "oklch(0.65 0.15 145)",   // 03 green
    "oklch(0.72 0.12 55)",    // 04 ember/gold (highlighted)
    "oklch(0.65 0.15 25)",    // 05 red/coral
    "oklch(0.65 0.12 220)",   // 06 blue
  ];

  return (
    <section ref={ref} className="relative py-24 sm:py-32 px-6">
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 50% 30%, oklch(0.72 0.12 55 / 0.03), transparent 60%)",
        }}
      />
      <div className="max-w-6xl mx-auto relative">
        {/* Header — scroll-linked */}
        <motion.div
          style={{ y: headerY, opacity: headerOpacity }}
          className="text-center mb-6"
        >
          <p
            className="text-xs font-semibold uppercase text-ember mb-4 tracking-[0.2em]"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            The Cost of Waiting
          </p>
          <div className="w-12 h-0.5 bg-ember mx-auto mb-6" />
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-cream leading-tight mb-6"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            The problems do not go away
            <br />
            because{" "}
            <span className="italic" style={{ background: "linear-gradient(90deg, oklch(0.72 0.12 55), oklch(0.8 0.1 70))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              you downloaded the PDF.
            </span>
          </h2>
          <p
            className="text-cream/45 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Delaying implementation doesn't just slow progress—
            <br className="hidden sm:block" />
            it compounds the cost to your business, your team, and your future.
          </p>
        </motion.div>

        {/* ── Desktop: 3-column grid (2 rows of 3) ── */}
        <div className="hidden lg:grid grid-cols-3 gap-4 mt-14 mb-10">
          {painPointsData.map((p, i) => {
            const start = 0.12 + i * 0.05;
            const end = start + 0.18;
            return (
              <ScrollCard key={i} index={i} scrollYProgress={scrollYProgress}
                className="relative rounded-xl overflow-hidden"
                style={{
                  background: p.highlight ? "oklch(0.15 0.02 55 / 0.7)" : "oklch(0.15 0.01 250 / 0.6)",
                  border: p.highlight ? "1px solid oklch(0.72 0.12 55 / 0.35)" : "1px solid oklch(1 0 0 / 0.06)",
                }}
              >
                <div className="p-5 flex items-start gap-4">
                  {/* Number + Icon */}
                  <div className="flex flex-col items-center gap-3 shrink-0">
                    <span
                      className="text-lg font-bold"
                      style={{ fontFamily: "'Sora', sans-serif", color: p.color }}
                    >
                      {p.num}
                    </span>
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{
                        border: `2px solid ${p.color}`,
                        background: `${p.color.replace(")", " / 0.08)")}`,
                      }}
                    >
                      <p.icon size={20} style={{ color: p.color }} />
                    </div>
                    <ChevronRight size={14} style={{ color: p.color, opacity: 0.5 }} />
                  </div>
                  {/* Text */}
                  <div className="pt-1">
                    <h3
                      className="text-sm font-bold text-cream mb-1.5 leading-snug"
                      style={{ fontFamily: "'Sora', sans-serif" }}
                    >
                      {p.title}
                    </h3>
                    <p
                      className="text-xs text-cream/40 leading-relaxed"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      {p.desc}
                    </p>
                  </div>
                </div>
              </ScrollCard>
            );
          })}
        </div>

        {/* ── Tablet: 2-column grid ── */}
        <div className="hidden sm:grid lg:hidden grid-cols-2 gap-4 mt-14 mb-10">
          {painPointsData.map((p, i) => {
            return (
              <ScrollCard key={i} index={i} scrollYProgress={scrollYProgress}
                className="relative rounded-xl overflow-hidden"
                style={{
                  background: p.highlight ? "oklch(0.15 0.02 55 / 0.7)" : "oklch(0.15 0.01 250 / 0.6)",
                  border: p.highlight ? "1px solid oklch(0.72 0.12 55 / 0.35)" : "1px solid oklch(1 0 0 / 0.06)",
                }}
              >
                <div className="p-5 flex items-start gap-4">
                  <div className="flex flex-col items-center gap-3 shrink-0">
                    <span className="text-lg font-bold" style={{ fontFamily: "'Sora', sans-serif", color: p.color }}>
                      {p.num}
                    </span>
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ border: `2px solid ${p.color}`, background: `${p.color.replace(")", " / 0.08)")}` }}
                    >
                      <p.icon size={20} style={{ color: p.color }} />
                    </div>
                  </div>
                  <div className="pt-1">
                    <h3 className="text-sm font-bold text-cream mb-1.5 leading-snug" style={{ fontFamily: "'Sora', sans-serif" }}>
                      {p.title}
                    </h3>
                    <p className="text-xs text-cream/40 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {p.desc}
                    </p>
                  </div>
                </div>
              </ScrollCard>
            );
          })}
        </div>

        {/* ── Mobile: Vertical timeline ── */}
        <div className="sm:hidden mt-12 mb-10">
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[52px] top-0 bottom-0 w-px bg-cream/[0.06]" />

            {painPointsData.map((p, i) => {
              const mStart = 0.12 + i * 0.08;
              const mEnd = mStart + 0.15;
              return (
                <ScrollCard key={i} index={i} scrollYProgress={scrollYProgress}
                  className="relative mb-3"
                >
                  <div
                    className="rounded-xl p-4 flex items-center gap-4"
                    style={{
                      background: p.highlight ? "oklch(0.15 0.02 55 / 0.7)" : "oklch(0.15 0.01 250 / 0.6)",
                      border: p.highlight ? "1px solid oklch(0.72 0.12 55 / 0.35)" : "1px solid oklch(1 0 0 / 0.06)",
                    }}
                  >
                    {/* Number */}
                    <span
                      className="text-base font-bold w-8 shrink-0 text-center"
                      style={{ fontFamily: "'Sora', sans-serif", color: p.color }}
                    >
                      {p.num}
                    </span>
                    {/* Dot on timeline */}
                    <div className="relative shrink-0">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ background: p.highlight ? p.color : "oklch(0.72 0.12 55 / 0.5)" }}
                      />
                    </div>
                    {/* Icon */}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        border: `2px solid ${p.color}`,
                        background: `${p.color.replace(")", " / 0.08)")}`,
                      }}
                    >
                      <p.icon size={18} style={{ color: p.color }} />
                    </div>
                    {/* Text */}
                    <div className="min-w-0">
                      <h3
                        className="text-xs font-bold text-cream leading-snug"
                        style={{ fontFamily: "'Sora', sans-serif" }}
                      >
                        {p.title}
                      </h3>
                      <p
                        className="text-[10px] text-cream/40 leading-relaxed mt-0.5"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      >
                        {p.desc}
                      </p>
                    </div>
                  </div>
                </ScrollCard>
              );
            })}
          </div>
        </div>

        {/* ── "Get in the room" CTA Bar ── */}
        <motion.div
          style={{ y: ctaY, opacity: ctaOpacity }}
          className="text-center mb-6"
        >
          <CTAButton label="Get in the room" variant="primary" />
        </motion.div>

        {/* ── Closing Message Bar ── */}
        <motion.div
          style={{ y: closeY, opacity: closeOpacity, background: "oklch(0.15 0.01 250 / 0.6)", border: "1px solid oklch(0.72 0.12 55 / 0.12)" }}
          className="rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-5"
        >
          {/* Left: Shield icon + message */}
          <div className="flex items-center gap-4 sm:flex-1">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: "oklch(0.72 0.12 55 / 0.12)",
                border: "1px solid oklch(0.72 0.12 55 / 0.25)",
              }}
            >
              <ShieldCheck size={28} className="text-ember" />
            </div>
            <div>
              <p className="text-base sm:text-lg font-bold text-cream leading-snug" style={{ fontFamily: "'Sora', sans-serif" }}>
                You don't have to keep figuring it out{" "}
                <span className="text-ember">on your own.</span>
              </p>
              <p className="text-xs sm:text-sm text-cream/45 mt-1 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Join a private community of contractors who are building better businesses—together.
              </p>
            </div>
          </div>
          {/* Right: Stats (desktop only) */}
          <div className="hidden sm:flex items-center gap-6">
            <div className="text-center">
              <p className="text-lg font-bold text-ember" style={{ fontFamily: "'Sora', sans-serif" }}>$2.5B+</p>
              <p className="text-[10px] text-cream/40" style={{ fontFamily: "'DM Sans', sans-serif" }}>in construction<br/>experience</p>
            </div>
            <div className="w-px h-10 bg-cream/10" />
            <div className="text-center">
              <p className="text-lg font-bold text-ember" style={{ fontFamily: "'Sora', sans-serif" }}>Hundreds</p>
              <p className="text-[10px] text-cream/40" style={{ fontFamily: "'DM Sans', sans-serif" }}>of contractors<br/>helped</p>
            </div>
            <div className="w-px h-10 bg-cream/10" />
            <div className="text-center">
              <p className="text-lg font-bold text-ember" style={{ fontFamily: "'Sora', sans-serif" }}>Proven</p>
              <p className="text-[10px] text-cream/40" style={{ fontFamily: "'DM Sans', sans-serif" }}>systems. Real<br/>world results.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: PROOF — Revenue cards with construction icons + testimonials
// ═══════════════════════════════════════════════════════════════════════════════

function ProofSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.3"] });

  const headerY = useTransform(scrollYProgress, [0, 0.1], [50, 0]);
  const headerOpacity = useTransform(scrollYProgress, [0, 0.1], [0, 1]);

  const ctaY = useTransform(scrollYProgress, [0.7, 0.85], [40, 0]);
  const ctaOpacity = useTransform(scrollYProgress, [0.7, 0.85], [0, 1]);

  const companyIcons = [Building2, Home, Hammer, Hammer, Building2];
  const companyColors = [
    "oklch(0.72 0.12 55)",  // ember
    "oklch(0.65 0.12 220)", // blue
    "oklch(0.65 0.15 145)", // green
    "oklch(0.72 0.12 55)",  // ember
    "oklch(0.65 0.12 220)", // blue
  ];

  return (
    <section ref={ref} className="relative py-24 sm:py-32 px-6">
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 50% 20%, oklch(0.72 0.12 55 / 0.04), transparent 60%)",
        }}
      />

      <div className="max-w-6xl mx-auto relative">
        {/* Header */}
        <motion.div
          style={{ y: headerY, opacity: headerOpacity }}
          className="text-center mb-6"
        >
          <p
            className="text-xs font-semibold uppercase text-ember mb-4 tracking-[0.2em]"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Verified Member Results
          </p>
          <div className="w-12 h-0.5 bg-ember mx-auto mb-6" />
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-cream leading-tight mb-4"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Real contractors.{" "}
            <span className="italic" style={{ background: "linear-gradient(90deg, oklch(0.72 0.12 55), oklch(0.8 0.1 70))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Real movement.
            </span>
          </h2>
          <p
            className="text-cream/45 text-sm sm:text-base max-w-xl mx-auto leading-relaxed"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Results from contractors who took action.
            <br />
            Systems, coaching, and community that drive real growth.
          </p>
        </motion.div>

        {/* ── Desktop Revenue Cards: 3 + 2 + stats ── */}
        <div className="hidden lg:block mt-14 mb-10">
          {/* Single grid: 4 cols, 2 rows — stats card spans both rows on the right */}
          <div className="grid grid-cols-4 grid-rows-2 gap-4">
            {/* Row 1: 3 company cards */}
            {proofCards.slice(0, 3).map((card, i) => {
              const Icon = companyIcons[i];
              const color = companyColors[i];
              return (
                <ScrollCard key={i} index={i} scrollYProgress={scrollYProgress}
                  className="rounded-xl overflow-hidden"
                  style={{
                    background: "oklch(0.15 0.01 250 / 0.6)",
                    border: "1px solid oklch(1 0 0 / 0.06)",
                  }}
                >
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ background: `${color.replace(")", " / 0.12)")}`, border: `1px solid ${color.replace(")", " / 0.25)")}` }}
                        >
                          <Icon size={18} style={{ color }} />
                        </div>
                        <span className="text-sm font-bold text-cream uppercase tracking-wide" style={{ fontFamily: "'Sora', sans-serif" }}>
                          {card.company}
                        </span>
                      </div>
                      <span
                        className="text-xs font-bold px-2.5 py-1 rounded-full"
                        style={{
                          background: `${color.replace(")", " / 0.15)")}`,
                          color,
                          border: `1px solid ${color.replace(")", " / 0.3)")}`,
                        }}
                      >
                        {card.multiplier}
                      </span>
                    </div>
                    <p className="text-[10px] text-cream/30 uppercase tracking-[0.15em] mb-2" style={{ fontFamily: "'Sora', sans-serif" }}>
                      Grew From
                    </p>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm text-cream/35">{card.before}</span>
                      <ArrowRight size={12} className="text-ember/50" />
                      <span className="text-3xl font-black text-ember" style={{ fontFamily: "'Sora', sans-serif" }}>
                        {card.after}
                      </span>
                    </div>
                    <p className="text-[10px] text-cream/30 uppercase tracking-[0.1em]" style={{ fontFamily: "'Sora', sans-serif" }}>
                      {card.period} with ALP
                    </p>
                  </div>
                </ScrollCard>
              );
            })}

            {/* Stats summary card — spans both rows on the right */}
            <ScrollCard index={3} scrollYProgress={scrollYProgress}
              className="rounded-xl overflow-hidden row-span-2"
              style={{
                background: "linear-gradient(135deg, oklch(0.15 0.02 55 / 0.6), oklch(0.12 0.01 250 / 0.6))",
                border: "1px solid oklch(0.72 0.12 55 / 0.2)",
              }}
            >
              <div className="p-6 flex flex-col items-center justify-center h-full text-center">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center mb-5"
                  style={{ background: "oklch(0.72 0.12 55 / 0.15)", border: "1px solid oklch(0.72 0.12 55 / 0.3)" }}
                >
                  <Trophy size={28} className="text-ember" />
                </div>
                <p className="text-4xl font-black text-cream mb-1" style={{ fontFamily: "'Sora', sans-serif" }}>
                  $<AnimatedCounter target={100} suffix="M+" />
                </p>
                <p className="text-[10px] text-cream/40 uppercase tracking-[0.15em] mb-5 leading-relaxed" style={{ fontFamily: "'Sora', sans-serif" }}>
                  Revenue generated across
                  <br />ALP member outcomes
                </p>
                <div className="w-12 h-px bg-ember/25 mb-5" />
                <p className="text-3xl font-black text-cream mb-1" style={{ fontFamily: "'Sora', sans-serif" }}>
                  $2.5B+
                </p>
                <p className="text-[10px] text-cream/40 uppercase tracking-[0.15em] leading-relaxed" style={{ fontFamily: "'Sora', sans-serif" }}>
                  Construction experience
                  <br />behind the room
                </p>
              </div>
            </ScrollCard>

            {/* Row 2: 2 company cards + 1 empty cell */}
            {proofCards.slice(3).map((card, i) => {
              const idx = i + 3;
              const Icon = companyIcons[idx];
              const color = companyColors[idx];
              return (
                <ScrollCard key={idx} index={idx} scrollYProgress={scrollYProgress}
                  className="rounded-xl overflow-hidden"
                  style={{
                    background: "oklch(0.15 0.01 250 / 0.6)",
                    border: "1px solid oklch(1 0 0 / 0.06)",
                  }}
                >
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ background: `${color.replace(")", " / 0.12)")}`, border: `1px solid ${color.replace(")", " / 0.25)")}` }}
                        >
                          <Icon size={18} style={{ color }} />
                        </div>
                        <span className="text-sm font-bold text-cream uppercase tracking-wide" style={{ fontFamily: "'Sora', sans-serif" }}>
                          {card.company}
                        </span>
                      </div>
                      <span
                        className="text-xs font-bold px-2.5 py-1 rounded-full"
                        style={{
                          background: `${color.replace(")", " / 0.15)")}`,
                          color,
                          border: `1px solid ${color.replace(")", " / 0.3)")}`,
                        }}
                      >
                        {card.multiplier}
                      </span>
                    </div>
                    <p className="text-[10px] text-cream/30 uppercase tracking-[0.15em] mb-2" style={{ fontFamily: "'Sora', sans-serif" }}>
                      Grew From
                    </p>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm text-cream/35">{card.before}</span>
                      <ArrowRight size={12} className="text-ember/50" />
                      <span className="text-3xl font-black text-ember" style={{ fontFamily: "'Sora', sans-serif" }}>
                        {card.after}
                      </span>
                    </div>
                    <p className="text-[10px] text-cream/30 uppercase tracking-[0.1em]" style={{ fontFamily: "'Sora', sans-serif" }}>
                      {card.period} with ALP
                    </p>
                  </div>
                </ScrollCard>
              );
            })}
            {/* Empty cell — stats card occupies this spot via row-span-2 */}
            <div />
          </div>
        </div>

        {/* ── Mobile/Tablet Revenue Cards ── */}
        <div className="lg:hidden mt-12 mb-10 space-y-3">
          {proofCards.map((card, i) => {
            const Icon = companyIcons[i];
            const color = companyColors[i];
            return (
              <ScrollCard key={i} index={i} scrollYProgress={scrollYProgress}
                className="rounded-xl overflow-hidden"
                style={{
                  background: "oklch(0.15 0.01 250 / 0.6)",
                  border: "1px solid oklch(1 0 0 / 0.06)",
                }}
              >
                <div className="p-4">
                  {/* Top row: icon + company name + badge */}
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${color.replace(")", " / 0.12)")}`, border: `1px solid ${color.replace(")", " / 0.25)")}` }}
                    >
                      <Icon size={18} style={{ color }} />
                    </div>
                    <span className="text-sm font-bold text-cream uppercase tracking-wide" style={{ fontFamily: "'Sora', sans-serif" }}>
                      {card.company}
                    </span>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto shrink-0"
                      style={{
                        background: `${color.replace(")", " / 0.15)")}`,
                        color,
                        border: `1px solid ${color.replace(")", " / 0.3)")}`,
                      }}
                    >
                      {card.multiplier}
                    </span>
                  </div>
                  {/* Bottom row: revenue growth */}
                  <div className="flex items-center gap-4 pl-[52px]">
                    <div>
                      <p className="text-[9px] text-cream/30 uppercase tracking-[0.1em] mb-1" style={{ fontFamily: "'Sora', sans-serif" }}>
                        Grew From
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-cream/40">{card.before}</span>
                        <ArrowRight size={12} className="text-ember/50" />
                        <span className="text-3xl font-black text-ember" style={{ fontFamily: "'Sora', sans-serif" }}>
                          {card.after}
                        </span>
                      </div>
                    </div>
                    <div className="ml-auto flex items-center gap-1.5">
                      <Calendar size={10} className="text-cream/25" />
                      <p className="text-[9px] text-cream/30 uppercase tracking-[0.1em]" style={{ fontFamily: "'Sora', sans-serif" }}>
                        {card.period} with ALP
                      </p>
                    </div>
                  </div>
                </div>
              </ScrollCard>
            );
          })}
          {/* Stats summary card (mobile) */}
          <ScrollCard index={5} scrollYProgress={scrollYProgress}
            className="rounded-xl overflow-hidden"
            style={{
              background: "linear-gradient(135deg, oklch(0.15 0.02 55 / 0.6), oklch(0.12 0.01 250 / 0.6))",
              border: "1px solid oklch(0.72 0.12 55 / 0.2)",
            }}
          >
            <div className="p-5 flex items-center justify-around text-center">
              <div>
                <Trophy size={22} className="text-ember mx-auto mb-2" />
                <p className="text-2xl font-black text-cream" style={{ fontFamily: "'Sora', sans-serif" }}>
                  $100M+
                </p>
                <p className="text-[9px] text-cream/40 uppercase tracking-[0.1em] leading-relaxed" style={{ fontFamily: "'Sora', sans-serif" }}>
                  Revenue generated across<br />ALP member outcomes
                </p>
              </div>
              <div className="w-px h-16 bg-ember/20" />
              <div>
                <p className="text-2xl font-black text-cream" style={{ fontFamily: "'Sora', sans-serif" }}>
                  $2.5B+
                </p>
                <p className="text-[9px] text-cream/40 uppercase tracking-[0.1em] leading-relaxed" style={{ fontFamily: "'Sora', sans-serif" }}>
                  Construction experience<br />behind the room
                </p>
              </div>
            </div>
          </ScrollCard>
        </div>

        {/* ── "What Members Are Saying" divider (mobile) ── */}
        <div className="lg:hidden text-center mb-6 mt-8">
          <div className="flex items-center justify-center gap-1 mb-2">
            {[...Array(4)].map((_, i) => (
              <Star key={i} size={12} className="text-ember fill-ember" />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-cream/[0.06]" />
            <p className="text-[10px] font-bold text-cream/40 uppercase tracking-[0.2em]" style={{ fontFamily: "'Sora', sans-serif" }}>
              What Members Are Saying
            </p>
            <div className="flex-1 h-px bg-cream/[0.06]" />
          </div>
        </div>

        {/* ── Testimonials ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {testimonials.map((t, i) => (
            <ScrollCard key={i} index={i + 6} scrollYProgress={scrollYProgress}
              className="rounded-xl overflow-hidden"
              style={{
                background: "oklch(0.15 0.01 250 / 0.6)",
                border: "1px solid oklch(1 0 0 / 0.06)",
              }}
            >
              <div className="p-5 sm:p-6">
                {/* Quote mark + stars */}
                <div className="flex items-start justify-between mb-4">
                  <span
                    className="text-4xl font-serif text-ember/20 leading-none select-none"
                    style={{ fontFamily: "Georgia, serif" }}
                  >
                    "
                  </span>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} size={11} className="text-ember fill-ember" />
                    ))}
                  </div>
                </div>
                <p
                  className="text-sm text-cream/55 leading-relaxed mb-5"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {t.quote}
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-px bg-ember/30" />
                  <p
                    className="text-xs font-bold text-ember tracking-wider uppercase"
                    style={{ fontFamily: "'Sora', sans-serif" }}
                  >
                    {t.name}
                  </p>
                </div>
              </div>
            </ScrollCard>
          ))}
        </div>

        {/* ── "PROVEN. REPEATABLE. REAL." CTA Bar ── */}
        <motion.div
          style={{ y: ctaY, opacity: ctaOpacity, background: "oklch(0.15 0.01 250 / 0.6)", border: "1px solid oklch(0.72 0.12 55 / 0.15)" }}
          className="rounded-xl p-5 sm:p-6"
        >
          {/* Desktop layout */}
          <div className="hidden sm:flex items-center gap-6">
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "oklch(0.72 0.12 55 / 0.12)", border: "1px solid oklch(0.72 0.12 55 / 0.25)" }}
            >
              <ShieldCheck size={32} className="text-ember" />
            </div>
            <div className="flex-1">
              <p className="text-lg font-black text-cream uppercase tracking-wide mb-1" style={{ fontFamily: "'Sora', sans-serif" }}>
                Proven. Repeatable. Real.
              </p>
              <p className="text-sm text-cream/45" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Join contractors who are building stronger companies, better teams, and bigger legacies.
              </p>
            </div>
            <CTAButton label="Join The Circle" variant="primary" />
          </div>
          {/* Mobile layout */}
          <div className="sm:hidden">
            <div className="flex items-center gap-4 mb-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "oklch(0.72 0.12 55 / 0.12)", border: "1px solid oklch(0.72 0.12 55 / 0.25)" }}
              >
                <ShieldCheck size={24} className="text-ember" />
              </div>
              <div>
                <p className="text-sm font-black text-cream uppercase tracking-wide" style={{ fontFamily: "'Sora', sans-serif" }}>
                  Proven. Repeatable. Real.
                </p>
                <p className="text-xs text-cream/45 mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Join contractors building stronger companies, better teams, and bigger legacies.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <CTAButton label="Join The Circle" variant="primary" />

            </div>
            {/* Feature icons row */}
            <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-cream/[0.06]">
              {[
                { icon: Users, label: "Elite\nCommunity" },
                { icon: BarChart3, label: "Proven\nSystems" },
                { icon: Compass, label: "Expert\nCoaching" },
                { icon: Trophy, label: "Real\nResults" },
              ].map((item, i) => (
                <div key={i} className="text-center">
                  <item.icon size={16} className="text-ember/60 mx-auto mb-1" />
                  <p className="text-[8px] text-cream/35 uppercase tracking-wider whitespace-pre-line leading-tight" style={{ fontFamily: "'Sora', sans-serif" }}>
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6: THE DIFFERENCE — Premium comparison with VS badge
// ═══════════════════════════════════════════════════════════════════════════════

function MobilePillarScroll({ pillars }: { pillars: { icon: any; label: string; sub: string }[] }) {
  const [showHint, setShowHint] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setShowHint(false);
    el.addEventListener('scroll', onScroll, { once: true });
    const timer = setTimeout(() => setShowHint(false), 4000);
    return () => { el.removeEventListener('scroll', onScroll); clearTimeout(timer); };
  }, []);
  return (
    <div className="sm:hidden relative">
      {/* Fade edges to hint at more content */}
      <div className="absolute left-0 top-0 bottom-2 w-8 bg-gradient-to-r from-dark to-transparent z-[5] pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-dark to-transparent z-[5] pointer-events-none" />
      {/* Arrow indicators overlaid on edges */}
      <motion.div
        className="absolute left-1 top-1/2 -translate-y-1/2 z-10 pointer-events-none"
        initial={{ opacity: 1 }}
        animate={{ opacity: showHint ? 1 : 0 }}
        transition={{ duration: 0.5 }}
      >
        <ChevronLeft size={16} className="text-ember animate-pulse" />
      </motion.div>
      <motion.div
        className="absolute right-1 top-1/2 -translate-y-1/2 z-10 pointer-events-none"
        initial={{ opacity: 1 }}
        animate={{ opacity: showHint ? 1 : 0 }}
        transition={{ duration: 0.5 }}
      >
        <ChevronRight size={16} className="text-ember animate-pulse" />
      </motion.div>
      <div ref={scrollRef} className="flex gap-4 overflow-x-auto pb-2 px-8 scrollbar-hide">
        {pillars.map((p, i) => (
          <div key={i} className="flex flex-col items-center text-center gap-2 shrink-0" style={{ minWidth: '72px' }}>
            <div className="w-10 h-10 rounded-full border border-ember/30 bg-ember/[0.08] flex items-center justify-center">
              <p.icon size={16} className="text-ember" />
            </div>
            <p className="text-[9px] font-bold text-cream uppercase tracking-wider leading-tight" style={{ fontFamily: "'Sora', sans-serif" }}>
              {p.label}
            </p>
          </div>
        ))}
      </div>
      {/* Swipe hint text */}
      <motion.p
        className="text-center text-[10px] text-cream/40 mt-1 tracking-wider uppercase"
        initial={{ opacity: 1 }}
        animate={{ opacity: showHint ? 1 : 0 }}
        transition={{ duration: 0.5 }}
        style={{ fontFamily: "'Sora', sans-serif" }}
      >
        ← Swipe to explore →
      </motion.p>
    </div>
  );
}

function ComparisonSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });

  const headerY = useTransform(scrollYProgress, [0, 0.2], [60, 0]);
  const headerOp = useTransform(scrollYProgress, [0, 0.2], [0, 1]);
  const pillarOp = useTransform(scrollYProgress, [0.08, 0.22], [0, 1]);
  const pillarY = useTransform(scrollYProgress, [0.08, 0.22], [40, 0]);
  // Comparison panel header animates in first
  const compOp = useTransform(scrollYProgress, [0.15, 0.28], [0, 1]);
  const compY = useTransform(scrollYProgress, [0.15, 0.28], [50, 0]);
  // Individual row animations — stagger each row as user scrolls
  const row0Op = useTransform(scrollYProgress, [0.22, 0.32], [0, 1]);
  const row0Y = useTransform(scrollYProgress, [0.22, 0.32], [30, 0]);
  const row1Op = useTransform(scrollYProgress, [0.27, 0.37], [0, 1]);
  const row1Y = useTransform(scrollYProgress, [0.27, 0.37], [30, 0]);
  const row2Op = useTransform(scrollYProgress, [0.32, 0.42], [0, 1]);
  const row2Y = useTransform(scrollYProgress, [0.32, 0.42], [30, 0]);
  const row3Op = useTransform(scrollYProgress, [0.37, 0.47], [0, 1]);
  const row3Y = useTransform(scrollYProgress, [0.37, 0.47], [30, 0]);
  const row4Op = useTransform(scrollYProgress, [0.42, 0.52], [0, 1]);
  const row4Y = useTransform(scrollYProgress, [0.42, 0.52], [30, 0]);
  const row5Op = useTransform(scrollYProgress, [0.47, 0.57], [0, 1]);
  const row5Y = useTransform(scrollYProgress, [0.47, 0.57], [30, 0]);
  const summaryOp = useTransform(scrollYProgress, [0.52, 0.62], [0, 1]);
  const summaryY = useTransform(scrollYProgress, [0.52, 0.62], [30, 0]);
  const rowAnimations = [
    { opacity: row0Op, y: row0Y }, { opacity: row1Op, y: row1Y },
    { opacity: row2Op, y: row2Y }, { opacity: row3Op, y: row3Y },
    { opacity: row4Op, y: row4Y }, { opacity: row5Op, y: row5Y },
  ];
  const ctaOp = useTransform(scrollYProgress, [0.6, 0.75], [0, 1]);
  const ctaY = useTransform(scrollYProgress, [0.6, 0.75], [40, 0]);

  const pillars = [
    { icon: Target, label: "Real Problems", sub: "brought to the room" },
    { icon: CheckCircle2, label: "Real Decisions", sub: "pressure-tested" },
    { icon: Users, label: "Real Implementation", sub: "built for your business" },
    { icon: Activity, label: "Real Rhythm", sub: "community + follow-through" },
    { icon: BarChart3, label: "Real Results", sub: "from $2.5B+ perspective" },
  ];

  const { startCheckout, isLoading } = useCircleCheckout();

  return (
    <section ref={sectionRef} className="relative py-24 sm:py-32 px-6 overflow-visible">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div style={{ y: headerY, opacity: headerOp }} className="text-center mb-12 sm:mb-16">
          <p className="text-xs font-semibold uppercase text-ember mb-4 tracking-[0.2em]" style={{ fontFamily: "'Sora', sans-serif" }}>
            The Difference
          </p>
          <div className="w-12 h-[2px] bg-ember mx-auto mb-6" />
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-cream leading-tight" style={{ fontFamily: "'Sora', sans-serif" }}>
            Most coaching gives you information.
            <br />
            <span className="text-ember" style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic" }}>
              The Circle gives you operating pressure.
            </span>
          </h2>
          <p className="text-cream/50 mt-6 text-base sm:text-lg max-w-xl mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            See the shift from passive learning to proven execution.
          </p>
        </motion.div>

        {/* 5-Pillar Bar */}
        <motion.div
          style={{ y: pillarY, opacity: pillarOp }}
          className="mb-12 sm:mb-16 rounded-xl border border-cream/10 bg-cream/[0.03] backdrop-blur-sm p-4 sm:p-6"
        >
          {/* Desktop: 5-column grid */}
          <div className="hidden sm:grid grid-cols-5 gap-4">
            {pillars.map((p, i) => (
              <div key={i} className="flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-full border border-ember/30 bg-ember/[0.08] flex items-center justify-center">
                  <p.icon size={20} className="text-ember" />
                </div>
                <div>
                  <p className="text-xs font-bold text-cream uppercase tracking-wider" style={{ fontFamily: "'Sora', sans-serif" }}>
                    {p.label}
                  </p>
                  <p className="text-[11px] text-cream/40 mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {p.sub}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {/* Mobile: horizontal scroll row with scroll indicator */}
          <MobilePillarScroll pillars={pillars} />
        </motion.div>

        {/* Comparison Panel */}
        <motion.div style={{ y: compY, opacity: compOp }} className="relative">
          {/* Desktop: side-by-side */}
          <div className="hidden lg:grid lg:grid-cols-[1fr_auto_1fr] gap-0 items-stretch">
            {/* Passive Program */}
            <div className="rounded-xl border border-cream/10 bg-cream/[0.03] p-6 sm:p-8">
              <div className="text-center mb-8 pb-6 border-b border-cream/[0.06]">
                <h3 className="text-lg font-bold text-cream/40 uppercase tracking-[0.15em]" style={{ fontFamily: "'Sora', sans-serif" }}>
                  Passive Program
                </h3>
                <p className="text-sm text-cream/25 mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Information without pressure
                </p>
              </div>
              <div className="space-y-5">
                {comparisonRows.map((row, i) => (
                  <motion.div key={i} style={{ opacity: rowAnimations[i]?.opacity, y: rowAnimations[i]?.y }} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full border border-cream/10 bg-cream/[0.04] flex items-center justify-center shrink-0 mt-0.5">
                      <X size={13} className="text-cream/20" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-cream/45" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        {row.passive}
                      </p>
                      <p className="text-xs text-cream/25 mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        {row.passiveSub}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
              {/* Summary */}
              <motion.div style={{ opacity: summaryOp, y: summaryY }} className="mt-8 pt-6 border-t border-cream/[0.06] flex items-center gap-3">
                <BarChart3 size={18} className="text-cream/15 shrink-0" />
                <div>
                  <p className="text-sm text-cream/30 font-medium" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    You stay stuck in knowledge.
                  </p>
                  <p className="text-xs text-cream/20" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Nothing changes.
                  </p>
                </div>
              </motion.div>
            </div>

            {/* VS Badge */}
            <div className="flex items-center justify-center px-4 relative z-10">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-ember via-amber-500 to-ember border-2 border-ember/60 flex items-center justify-center shadow-[0_0_30px_rgba(217,119,6,0.4)]">
                <span className="text-sm font-black text-charcoal tracking-wider" style={{ fontFamily: "'Sora', sans-serif" }}>VS</span>
              </div>
            </div>

            {/* Contractor Circle */}
            <div className="rounded-xl border border-ember/30 bg-ember/[0.04] p-6 sm:p-8 shadow-[0_0_40px_rgba(217,119,6,0.08)]">
              <div className="text-center mb-8 pb-6 border-b border-ember/15">
                <h3 className="text-lg font-bold text-ember uppercase tracking-[0.15em]" style={{ fontFamily: "'Sora', sans-serif" }}>
                  Contractor Circle
                </h3>
                <p className="text-sm text-ember/60 mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Pressure that creates progress
                </p>
              </div>
              <div className="space-y-5">
                {comparisonRows.map((row, i) => (
                  <motion.div key={i} style={{ opacity: rowAnimations[i]?.opacity, y: rowAnimations[i]?.y }} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full border border-ember/30 bg-ember/[0.12] flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={13} className="text-ember" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-cream/80" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        {row.circle}
                      </p>
                      <p className="text-xs text-cream/40 mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        {row.circleSub}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
              {/* Summary */}
              <motion.div style={{ opacity: summaryOp, y: summaryY }} className="mt-8 pt-6 border-t border-ember/15 flex items-center gap-3">
                <Rocket size={18} className="text-ember shrink-0" />
                <div>
                  <p className="text-sm text-ember/80 font-semibold" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    You get pressure. You take action.
                  </p>
                  <p className="text-sm text-ember font-bold" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    You get results.
                  </p>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Mobile: stacked two-column comparison */}
          <div className="lg:hidden">
            {/* Headers */}
            <div className="grid grid-cols-[1fr_auto_1fr] gap-0 mb-0">
              <div className="rounded-tl-xl border border-cream/10 bg-cream/[0.03] p-4 text-center">
                <h3 className="text-xs font-bold text-cream/40 uppercase tracking-[0.12em]" style={{ fontFamily: "'Sora', sans-serif" }}>
                  Passive Program
                </h3>
                <p className="text-[10px] text-cream/20 mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Information without pressure
                </p>
              </div>
              <div className="flex items-center justify-center px-2 relative z-10">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-ember via-amber-500 to-ember border border-ember/60 flex items-center justify-center shadow-[0_0_20px_rgba(217,119,6,0.35)]">
                  <span className="text-[10px] font-black text-charcoal tracking-wider" style={{ fontFamily: "'Sora', sans-serif" }}>VS</span>
                </div>
              </div>
              <div className="rounded-tr-xl border border-ember/30 bg-ember/[0.04] p-4 text-center">
                <h3 className="text-xs font-bold text-ember uppercase tracking-[0.12em]" style={{ fontFamily: "'Sora', sans-serif" }}>
                  Contractor Circle
                </h3>
                <p className="text-[10px] text-ember/50 mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Pressure that creates progress
                </p>
              </div>
            </div>

            {/* Rows */}
            {comparisonRows.map((row, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto_1fr] gap-0">
                <div className={`border border-t-0 border-cream/10 bg-cream/[0.03] p-3 sm:p-4 ${i === comparisonRows.length - 1 ? "rounded-bl-xl" : ""}`}>
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full border border-cream/10 bg-cream/[0.04] flex items-center justify-center shrink-0 mt-0.5">
                      <X size={10} className="text-cream/20" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-cream/40 leading-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        {row.passive}
                      </p>
                      <p className="text-[10px] text-cream/20 mt-0.5 leading-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        {row.passiveSub}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="w-[1px] bg-cream/[0.06]" />
                <div className={`border border-t-0 border-ember/20 bg-ember/[0.04] p-3 sm:p-4 ${i === comparisonRows.length - 1 ? "rounded-br-xl" : ""}`}>
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full border border-ember/30 bg-ember/[0.12] flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={10} className="text-ember" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-cream/75 leading-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        {row.circle}
                      </p>
                      <p className="text-[10px] text-cream/35 mt-0.5 leading-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        {row.circleSub}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Mobile Summary Row */}
            <div className="grid grid-cols-[1fr_auto_1fr] gap-0 mt-0">
              <div className="rounded-bl-xl border border-t-0 border-cream/10 bg-cream/[0.03] p-3 sm:p-4">
                <div className="flex items-center gap-2">
                  <BarChart3 size={14} className="text-cream/15 shrink-0" />
                  <div>
                    <p className="text-[11px] text-cream/30 font-medium leading-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      You stay stuck in knowledge.
                    </p>
                    <p className="text-[10px] text-cream/20 leading-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      Nothing changes.
                    </p>
                  </div>
                </div>
              </div>
              <div className="w-[1px] bg-cream/[0.06]" />
              <div className="rounded-br-xl border border-t-0 border-ember/20 bg-ember/[0.04] p-3 sm:p-4">
                <div className="flex items-center gap-2">
                  <Rocket size={14} className="text-ember shrink-0" />
                  <div>
                    <p className="text-[11px] text-ember/70 font-medium leading-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      You get pressure. You take action.
                    </p>
                    <p className="text-[11px] text-ember font-bold leading-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      You get results.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* CTA Bar */}
        <motion.div
          style={{ y: ctaY, opacity: ctaOp }}
          className="mt-12 sm:mt-16 rounded-xl border border-cream/10 bg-cream/[0.03] backdrop-blur-sm p-6 sm:p-8"
        >
          {/* Desktop CTA */}
          <div className="hidden lg:flex items-center justify-between gap-8">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-lg border-2 border-ember/40 bg-gradient-to-br from-ember/15 to-amber-500/10 flex items-center justify-center shadow-[0_0_20px_rgba(217,119,6,0.15)]" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
                <Zap size={22} className="text-ember" fill="currentColor" />
              </div>
              <div>
                <p className="text-xs text-cream/40 uppercase tracking-wider font-semibold" style={{ fontFamily: "'Sora', sans-serif" }}>
                  This isn't just coaching.
                </p>
                <p className="text-xl font-bold text-cream" style={{ fontFamily: "'Sora', sans-serif" }}>
                  This is a different level.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              {[
                { icon: Users, label: "Real Operators", sub: "Active in the Circle" },
                { icon: Sparkles, label: "Proven Systems", sub: "That drive results" },
                { icon: Star, label: "Elite Accountability", sub: "That keeps you moving" },
                { icon: TrendingUp, label: "Measurable Growth", sub: "Month after month" },
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center text-center gap-1">
                  <item.icon size={16} className="text-ember/60" />
                  <p className="text-[10px] font-bold text-cream/60 uppercase" style={{ fontFamily: "'Sora', sans-serif" }}>
                    {item.label}
                  </p>
                  <p className="text-[9px] text-cream/30" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {item.sub}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex flex-col items-end gap-2">
              <button
                onClick={() => startCheckout()}
                disabled={isLoading}
                className="px-6 py-2.5 bg-gradient-to-r from-ember to-amber-500 text-charcoal font-bold text-xs uppercase tracking-wider rounded-lg hover:shadow-[0_0_25px_rgba(217,119,6,0.4)] transition-all flex items-center gap-2"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                Join The Circle
                <ArrowRight size={16} />
              </button>
              <p className="text-[10px] text-cream/25" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Spots are limited · Founding rate locked
              </p>
            </div>
          </div>

          {/* Mobile CTA */}
          <div className="lg:hidden">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-12 h-12 rounded-lg border-2 border-ember/40 bg-gradient-to-br from-ember/15 to-amber-500/10 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(217,119,6,0.15)]" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
                <Zap size={18} className="text-ember" fill="currentColor" />
              </div>
              <div>
                <p className="text-[10px] text-cream/40 uppercase tracking-wider font-semibold" style={{ fontFamily: "'Sora', sans-serif" }}>
                  This isn't just coaching.
                </p>
                <p className="text-lg font-bold text-cream" style={{ fontFamily: "'Sora', sans-serif" }}>
                  This is a different level.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 mb-5">
              <p className="text-sm text-cream/50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Join Contractor Circle and operate at the highest level of construction.
              </p>
            </div>
            <button
              onClick={() => startCheckout()}
              disabled={isLoading}
              className="w-full px-5 py-2.5 bg-gradient-to-r from-ember to-amber-500 text-charcoal font-bold text-xs uppercase tracking-wider rounded-lg hover:shadow-[0_0_25px_rgba(217,119,6,0.4)] transition-all flex items-center justify-center gap-2"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : null}
              Join The Circle
              <ArrowRight size={16} />
            </button>
            <p className="text-[10px] text-cream/25 text-center mt-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Spots are limited · Founding rate locked
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// SECTION 7: QUALIFICATION — For / Not For with premium badges
// ═══════════════════════════════════════════════════════════════════════════════

function QualificationSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const headerY = useTransform(scrollYProgress, [0, 0.3], [60, 0]);
  const headerOpacity = useTransform(scrollYProgress, [0, 0.25], [0, 1]);
  const leftCardX = useTransform(scrollYProgress, [0.1, 0.35], [-40, 0]);
  const leftCardOpacity = useTransform(scrollYProgress, [0.1, 0.35], [0, 1]);
  const rightCardX = useTransform(scrollYProgress, [0.15, 0.4], [40, 0]);
  const rightCardOpacity = useTransform(scrollYProgress, [0.15, 0.4], [0, 1]);
  const ctaY = useTransform(scrollYProgress, [0.35, 0.55], [30, 0]);
  const ctaOpacity = useTransform(scrollYProgress, [0.35, 0.55], [0, 1]);

  return (
    <section ref={sectionRef} className="relative py-24 sm:py-32 px-4 sm:px-6 overflow-hidden">
      {/* Construction silhouette background */}
      <div className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 200'%3E%3Cpath d='M0 200 L0 120 L50 120 L50 80 L55 80 L55 40 L60 40 L60 80 L80 80 L80 100 L120 100 L120 60 L125 60 L125 30 L130 30 L130 60 L150 60 L150 100 L200 100 L200 140 L300 140 L300 100 L350 100 L350 80 L400 80 L400 120 L500 120 L500 140 L600 140 L600 100 L650 100 L650 60 L655 60 L655 20 L660 20 L660 60 L700 60 L700 100 L800 100 L800 130 L900 130 L900 100 L950 100 L950 70 L1000 70 L1000 100 L1050 100 L1050 130 L1100 130 L1100 150 L1200 150 L1200 200 Z' fill='%23D97706'/%3E%3C/svg%3E")`,
          backgroundPosition: 'top center',
          backgroundRepeat: 'repeat-x',
          backgroundSize: '100% 200px',
        }}
      />

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          style={{ y: headerY, opacity: headerOpacity }}
          className="text-center mb-14 sm:mb-16"
        >
          <p className="text-xs sm:text-sm font-bold text-ember uppercase tracking-[0.25em] mb-4" style={{ fontFamily: "'Sora', sans-serif" }}>
            THIS IS FOR
          </p>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-cream leading-[1.15]"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            This is for contractors
            <br />
            <span className="text-ember" style={{ textDecoration: 'underline', textDecorationColor: '#D97706', textUnderlineOffset: '8px', textDecorationThickness: '3px' }}>who are done guessing.</span>
          </h2>
        </motion.div>

        {/* Two-column cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 mb-8">
          {/* FOR YOU IF card */}
          <motion.div
            style={{ x: leftCardX, opacity: leftCardOpacity }}
            className="relative p-6 sm:p-8 rounded-2xl border border-ember/30 bg-gradient-to-br from-[#1a1400]/80 to-[#0d0d0d]/90 backdrop-blur-sm"
          >
            {/* Ember glow on left edge */}
            <div className="absolute left-0 top-1/4 bottom-1/4 w-[2px] bg-gradient-to-b from-transparent via-ember to-transparent" />

            {/* Header with hexagonal check icon */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-ember/15 border border-ember/40 rounded-lg" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
                <Check size={18} className="text-ember" strokeWidth={3} />
              </div>
              <p className="text-sm sm:text-base font-bold text-ember uppercase tracking-wider" style={{ fontFamily: "'Sora', sans-serif" }}>
                FOR YOU IF
              </p>
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-ember/40 to-transparent mb-6" />

            {/* Items */}
            <div className="space-y-4 sm:space-y-5">
              {forYou.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-ember/15 border border-ember/40 flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={12} className="text-ember" strokeWidth={3} />
                  </div>
                  <span className="text-sm sm:text-base text-cream/90" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {item.split(/(\*\*.*?\*\*)/g).length > 1
                      ? item.split(' ').map((word, wi) => {
                          const boldWords = ['better estimating', 'systems,', 'direct access', 'serious contractor', 'actively trying'];
                          const isBold = boldWords.some(bw => bw.includes(word.toLowerCase().replace(',', '')));
                          return isBold
                            ? <span key={wi} className="text-ember font-semibold">{word} </span>
                            : <span key={wi}>{word} </span>;
                        })
                      : item
                    }
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* NOT FOR YOU IF card */}
          <motion.div
            style={{ x: rightCardX, opacity: rightCardOpacity }}
            className="relative p-6 sm:p-8 rounded-2xl border border-cream/10 bg-gradient-to-br from-[#111]/80 to-[#0a0a0a]/90 backdrop-blur-sm"
          >
            {/* Header with X icon */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-cream/[0.06] border border-cream/20 rounded-lg" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
                <X size={18} className="text-cream/50" strokeWidth={3} />
              </div>
              <p className="text-sm sm:text-base font-bold text-cream/50 uppercase tracking-wider" style={{ fontFamily: "'Sora', sans-serif" }}>
                NOT FOR YOU IF
              </p>
            </div>

            {/* Divider */}
            <div className="h-px bg-cream/10 mb-6" />

            {/* Items */}
            <div className="space-y-4 sm:space-y-5">
              {notForYou.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-cream/[0.04] border border-cream/15 flex items-center justify-center shrink-0 mt-0.5">
                    <X size={12} className="text-cream/40" strokeWidth={3} />
                  </div>
                  <span className="text-sm sm:text-base text-cream/50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Bottom CTA bar — "You either want to grow..." */}
        <motion.div
          style={{ y: ctaY, opacity: ctaOpacity }}
          className="relative p-5 sm:p-6 rounded-xl border border-ember/30 bg-gradient-to-r from-[#1a1400]/60 to-[#0d0d0d]/80 backdrop-blur-sm"
        >
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            {/* Target icon */}
            <div className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center bg-ember/15 border border-ember/40 rounded-xl shrink-0">
              <Target size={24} className="text-ember" />
            </div>

            {/* Text */}
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 flex-1">
              <p className="text-base sm:text-lg text-cream/90 text-center sm:text-left" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                You either want to <span className="text-ember font-semibold">grow</span>,
                <br className="sm:hidden" />{" "}or you want to <span className="text-ember font-semibold">stay where you are.</span>
              </p>

              {/* Vertical divider (desktop) */}
              <div className="hidden sm:block w-px h-10 bg-ember/30" />

              <p className="text-sm sm:text-base text-cream/70 text-center sm:text-left" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Contractor Circle is for<br />the ones who <span className="text-ember font-semibold">choose growth.</span>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 8: OBJECTION HANDLING — Accordion style
// ═══════════════════════════════════════════════════════════════════════════════

function ObjectionItem({ obj, index }: { obj: typeof objections[0]; index: number }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-20px" }}
      transition={{ duration: 0.5, ease, delay: index * 0.06 }}
      className="border-b border-cream/[0.05] last:border-b-0"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-5 sm:py-6 text-left group cursor-pointer"
      >
        <span
          className="text-base sm:text-lg font-semibold text-cream/80 group-hover:text-cream transition-colors duration-200 pr-4"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          "{obj.q}"
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          className="shrink-0"
        >
          <ChevronDown size={18} className="text-cream/25 group-hover:text-ember transition-colors" />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease }}
            className="overflow-hidden"
          >
            <p
              className="text-sm sm:text-base text-ember/90 font-medium leading-relaxed pb-6 pl-0"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {obj.a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ObjectionSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="relative py-24 sm:py-32 px-6">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease }}
          className="text-center mb-14"
        >
          <p
            className="text-xs font-semibold uppercase text-ember mb-4 tracking-[0.2em]"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Straight Answers
          </p>
          <h2
            className="text-3xl sm:text-4xl font-bold text-cream leading-tight"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            You might be thinking...
          </h2>
        </motion.div>

        <div className="rounded-2xl glass-card p-6 sm:p-8">
          {objections.map((obj, i) => (
            <ObjectionItem key={i} obj={obj} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 9: PRICING — Floating card with animated gradient border
// ═══════════════════════════════════════════════════════════════════════════════

function PricingSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const { startCheckout, isLoading } = useCircleCheckout();

  return (
    <section id="pricing" ref={ref} className="relative py-24 sm:py-32 px-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease }}
          className="text-center mb-14"
        >
          <p
            className="text-xs font-semibold uppercase text-ember mb-4 tracking-[0.2em]"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Founding Member Pricing
          </p>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-cream leading-tight"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Founding Member Access
          </h2>
          <motion.div
            initial={{ scaleX: 0 }}
            animate={isInView ? { scaleX: 1 } : {}}
            transition={{ duration: 1, delay: 0.3, ease }}
            className="w-16 h-[2px] mx-auto mt-6"
            style={{
              background: "linear-gradient(90deg, transparent, oklch(0.72 0.12 55), transparent)",
              transformOrigin: "center",
            }}
          />
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.92 }}
          animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 1, ease, delay: 0.2 }}
          className="relative"
        >
          {/* Rotating gradient border */}
          <motion.div
            className="absolute -inset-[1px] rounded-2xl opacity-60"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.72 0.12 55 / 0.4), transparent 40%, transparent 60%, oklch(0.72 0.12 55 / 0.2))",
            }}
            animate={{
              background: [
                "linear-gradient(135deg, oklch(0.72 0.12 55 / 0.4), transparent 40%, transparent 60%, oklch(0.72 0.12 55 / 0.2))",
                "linear-gradient(225deg, oklch(0.72 0.12 55 / 0.4), transparent 40%, transparent 60%, oklch(0.72 0.12 55 / 0.2))",
                "linear-gradient(315deg, oklch(0.72 0.12 55 / 0.4), transparent 40%, transparent 60%, oklch(0.72 0.12 55 / 0.2))",
                "linear-gradient(45deg, oklch(0.72 0.12 55 / 0.4), transparent 40%, transparent 60%, oklch(0.72 0.12 55 / 0.2))",
                "linear-gradient(135deg, oklch(0.72 0.12 55 / 0.4), transparent 40%, transparent 60%, oklch(0.72 0.12 55 / 0.2))",
              ],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          />

          {/* Ambient glow behind card */}
          <div
            className="absolute -inset-10 rounded-3xl blur-3xl pointer-events-none"
            style={{ background: "radial-gradient(ellipse at center, oklch(0.72 0.12 55 / 0.06), transparent 70%)" }}
          />

          <div className="relative rounded-2xl p-8 sm:p-10 bg-gradient-to-b from-cream/[0.04] to-midnight border border-ember/10 backdrop-blur-sm overflow-hidden">
            {/* Top glow line */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-ember/40 to-transparent" />

            {/* Badge */}
            <div className="flex items-center justify-center mb-8">
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-ember/10 border border-ember/25">
                <Shield size={14} className="text-ember" />
                <span
                  className="text-xs font-semibold tracking-wider uppercase text-ember"
                  style={{ fontFamily: "'Sora', sans-serif" }}
                >
                  Price Locked Forever
                </span>
              </div>
            </div>

            {/* Price */}
            <div className="text-center mb-3">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl sm:text-6xl lg:text-7xl font-bold text-cream" style={{ fontFamily: "'Sora', sans-serif" }}>
                  $497
                </span>
                <span className="text-xl text-cream/40">/mo</span>
              </div>
              <p className="text-sm text-cream/40 mt-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Cancel anytime. Founding rate locked while your membership stays active.
              </p>
            </div>

            {/* Divider */}
            <div className="w-full h-px bg-cream/[0.06] my-8" />

            {/* Includes */}
            <div className="space-y-3.5 mb-10">
              {pricingIncludes.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -25 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.5, ease, delay: 0.5 + i * 0.06 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-5 h-5 rounded-full bg-ember/15 flex items-center justify-center shrink-0">
                    <Check size={12} className="text-ember" />
                  </div>
                  <span className="text-sm sm:text-base text-cream/70" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {item}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, ease, delay: 1 }}
              className="relative"
            >
              <motion.div
                className="absolute inset-0 rounded-xl blur-xl"
                style={{ background: "oklch(0.72 0.12 55 / 0.25)" }}
                animate={{ opacity: [0.25, 0.5, 0.25] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
              <button
                onClick={startCheckout}
                disabled={isLoading}
                className="relative flex items-center justify-center gap-2.5 w-full py-3.5 bg-ember hover:bg-ember-light text-midnight font-bold text-sm sm:text-base rounded-xl transition-all duration-300 hover:scale-[1.02] shadow-[0_0_30px_oklch(0.72_0.12_55/0.15)] disabled:opacity-70 cursor-pointer group"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Redirecting to Checkout...
                  </>
                ) : (
                  <>
                    <Zap size={18} fill="currentColor" />
                    Join The Circle
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 10: FINAL CLOSE — Cinematic parallax background
// ═══════════════════════════════════════════════════════════════════════════════

function FinalCloseSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], ["-10%", "10%"]);

  return (
    <section ref={ref} className="relative py-28 sm:py-36 px-6 overflow-hidden">
      {/* Parallax background */}
      <motion.div className="absolute inset-0" style={{ y: bgY }}>
        <img src={FINAL_CTA_BG} alt="" className="w-full h-full object-cover" style={{ opacity: 0.45 }} />
      </motion.div>
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, oklch(0.10 0.01 270 / 0.7) 0%, oklch(0.10 0.01 270 / 0.4) 50%, oklch(0.10 0.01 270 / 0.7) 100%)",
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease }}
          className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          <span className="text-cream">Stop collecting tools.</span>
          <br />
          <span className="text-ember">Start building the machine.</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease, delay: 0.15 }}
          className="text-base sm:text-lg text-cream/50 max-w-xl mx-auto mb-10 leading-relaxed"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          The next move is not another saved video, another free PDF, or another month of solving
          the same problems alone. Bring the real business into the room.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease, delay: 0.3 }}
        >
          <CTAButton label="Join The Circle" />
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="text-sm text-cream/30 mt-5"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          $497/mo · Founding rate locked while active · Cancel anytime
        </motion.p>
      </div>
    </section>
  );
}

// ─── Footer ────────────────────────────────────────────────────────────────────

function JoinFooter() {
  return (
    <footer className="py-10 px-6 border-t border-cream/[0.04]">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-cream/20" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          &copy; {new Date().getFullYear()} ALP Contractor Circle. All rights reserved.
        </p>
        <div className="flex items-center gap-6">
          <a href="/" className="text-xs text-cream/25 hover:text-cream/50 transition-colors" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Home
          </a>
          <a href="https://app.alpcontractorcircle.com/login" className="text-xs text-cream/25 hover:text-cream/50 transition-colors" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Member Login
          </a>
          <a
            href="https://instagram.com/realmarshallwilkinson"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-cream/25 hover:text-cream/50 transition-colors"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Instagram
          </a>
        </div>
      </div>
    </footer>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function JoinPage() {
  return (
    <div className="min-h-screen bg-background text-foreground grain-overlay">
      {/* Ambient background blobs — static CSS to prevent flickering */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div
          className="absolute top-0 right-1/4 w-[600px] h-[600px] rounded-full blur-[200px]"
          style={{ background: "oklch(0.72 0.12 55 / 0.05)" }}
        />
        <div
          className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-[200px]"
          style={{ background: "oklch(0.65 0.12 240 / 0.04)" }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[250px]"
          style={{ background: "oklch(0.72 0.12 55 / 0.03)" }}
        />
      </div>

      <div className="relative z-10">
        <HeroSection />
        <SectionDivider />
        <BridgeSection />
        <SectionDivider />
        <WhatIsSection />
        <SectionDivider />
        <WhyNowSection />
        <SectionDivider />
        <ProofSection />
        <SectionDivider />
        <ComparisonSection />
        <SectionDivider />
        <QualificationSection />
        <SectionDivider />
        <ObjectionSection />
        <SectionDivider />
        <PricingSection />
        <SectionDivider />
        <FinalCloseSection />
        <JoinFooter />
      </div>
    </div>
  );
}
