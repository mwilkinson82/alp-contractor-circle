import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { ArrowRight, Zap, Loader2 } from "lucide-react";
import { useCircleCheckout } from "@/hooks/useCircleCheckout";

// Anchor: first call Sunday March 29, 2026 at 5 PM ET (21:00 UTC)
const FIRST_CALL_UTC = Date.UTC(2026, 2, 29, 21, 0, 0);
const CYCLE_MS = 14 * 24 * 60 * 60 * 1000;

function getNextCallDate(): Date {
  const now = Date.now();
  const msSinceAnchor = now - FIRST_CALL_UTC;
  if (msSinceAnchor < 0) return new Date(FIRST_CALL_UTC);
  const cyclesPassed = Math.floor(msSinceAnchor / CYCLE_MS);
  return new Date(FIRST_CALL_UTC + (cyclesPassed + 1) * CYCLE_MS);
}

function useCountdown(target: Date) {
  const calc = (t: Date) => {
    const total = t.getTime() - Date.now();
    if (total <= 0) return { d: 0, h: 0, m: 0, s: 0 };
    return {
      d: Math.floor(total / 86400000),
      h: Math.floor((total % 86400000) / 3600000),
      m: Math.floor((total % 3600000) / 60000),
      s: Math.floor((total % 60000) / 1000),
    };
  };
  const [t, setT] = useState(() => calc(target));
  useEffect(() => {
    const id = setInterval(() => setT(calc(target)), 1000);
    return () => clearInterval(id);
  }, [target]);
  return t;
}

// --- NextCallBadge component ---
function NextCallBadge() {
  const [nextCall] = useState(getNextCallDate);
  const { d, h, m, s } = useCountdown(nextCall);
  const dateStr = nextCall.toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", timeZone: "UTC",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.55, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl border border-cream/10 bg-cream/[0.04] backdrop-blur-sm"
      style={{ fontFamily: "'Sora', monospace" }}
    >
      {/* Live dot */}
      <span className="relative flex items-center justify-center w-2 h-2 shrink-0">
        <span
          className="absolute inline-flex h-full w-full rounded-full opacity-60"
          style={{ background: "oklch(0.60 0.22 25)", animation: "live-pulse 1.8s ease-out infinite" }}
        />
        <span className="relative inline-flex rounded-full w-1.5 h-1.5" style={{ background: "oklch(0.60 0.22 25)" }} />
      </span>

      {/* Label */}
      <span className="text-[10px] uppercase tracking-widest text-cream/40 font-medium">
        Next Call
      </span>

      {/* Divider */}
      <span className="text-cream/15 text-xs">|</span>

      {/* Date */}
      <span className="text-xs text-ember/80 font-semibold">{dateStr} · 5 PM ET</span>

      {/* Divider */}
      <span className="text-cream/15 text-xs">|</span>

      {/* Countdown units */}
      <div className="flex items-baseline gap-1.5">
        {[{ v: d, l: "d" }, { v: h, l: "h" }, { v: m, l: "m" }, { v: s, l: "s" }].map(({ v, l }, i) => (
          <span key={i} className="flex items-baseline gap-0.5">
            <span className="tabular-nums text-xs font-bold text-cream/80">{String(v).padStart(2, "0")}</span>
            <span className="text-[9px] text-cream/30 uppercase">{l}</span>
            {i < 3 && <span className="text-cream/20 text-xs ml-0.5">:</span>}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

const HERO_IMAGE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663332724241/F8sHs44hWg957N49MHxas2/marshall_hero_6c478c8c.webp";

const easeOutCubic = [0.22, 1, 0.36, 1] as [number, number, number, number];

// Cinematic word-by-word reveal
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
            ease: easeOutCubic,
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

// Scrolling transformation ticker
const transformations = [
  { name: "Brian Betancourt", result: "$600K → $20M in 18 months" },
  { name: "Morgan Tyler", result: "$300K → $10M first year" },
  { name: "Ronnie Silva", result: "$2M revenue — 2nd month as contractor" },
  { name: "Julius Davis", result: "$1M → $4M in 6 months" },
  { name: "ALP Members", result: "$2.5B+ in construction experience behind every call" },
  { name: "Brian Betancourt", result: "$600K → $20M in 18 months" },
  { name: "Morgan Tyler", result: "$300K → $10M first year" },
  { name: "Ronnie Silva", result: "$2M revenue — 2nd month as contractor" },
  { name: "Julius Davis", result: "$1M → $4M in 6 months" },
  { name: "ALP Members", result: "$2.5B+ in construction experience behind every call" },
];

function TransformationTicker() {
  return (
    <div className="relative overflow-hidden w-full py-3 border-y border-cream/[0.06]">
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
        style={{ background: "linear-gradient(90deg, oklch(0.08 0.02 260), transparent)" }} />
      <div className="absolute right-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
        style={{ background: "linear-gradient(-90deg, oklch(0.08 0.02 260), transparent)" }} />

      <motion.div
        className="flex gap-0 whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 28, ease: "linear", repeat: Infinity }}
      >
        {transformations.map((t, i) => (
          <span key={i} className="inline-flex items-center gap-3 px-8">
            <span className="text-xs font-semibold text-ember/80 tracking-wide" style={{ fontFamily: "'Sora', sans-serif" }}>
              {t.name}
            </span>
            <span className="text-cream/20 text-xs">—</span>
            <span className="text-xs text-cream/50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {t.result}
            </span>
            <span className="text-ember/20 text-base ml-4">◆</span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}

export function HeroSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { startCheckout, isLoading } = useCircleCheckout();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const imageScale = useTransform(scrollYProgress, [0, 1], [1, 1.18]);
  const imageY = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 0.5], [0.78, 0.97]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, -60]);

  return (
    <section ref={ref} className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Background Image with Parallax */}
      <motion.div
        className="absolute inset-0 z-0"
        style={{ scale: imageScale, y: imageY }}
      >
        <img
          src={HERO_IMAGE}
          alt="Marshall Wilkinson speaking at a conference"
          className="w-full h-full object-cover object-top"
        />
      </motion.div>

      {/* Multi-layer dark overlay */}
      <motion.div
        className="absolute inset-0 z-[1]"
        style={{
          opacity: overlayOpacity,
          background: `linear-gradient(180deg,
            oklch(0.08 0.02 260 / 0.88) 0%,
            oklch(0.08 0.02 260 / 0.72) 25%,
            oklch(0.08 0.02 260 / 0.78) 55%,
            oklch(0.08 0.02 260 / 0.97) 100%
          )`,
        }}
      />
      {/* Vignette */}
      <div
        className="absolute inset-0 z-[2] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 50% 40%, transparent 25%, oklch(0.08 0.02 260 / 0.65) 100%)",
        }}
      />
      {/* Grain */}
      <div
        className="absolute inset-0 z-[3] opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundSize: "128px 128px",
        }}
      />

      {/* Top Nav */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 sm:px-10 py-5">
        <div className="flex items-center gap-2.5">
          <span
            className="text-ember font-bold text-lg tracking-tight"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            ALP
          </span>
          <span className="text-cream/25 text-sm hidden sm:inline">|</span>
          <span
            className="text-cream/55 text-sm hidden sm:inline"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Contractor Circle
          </span>
        </div>
        <a
          href="/portal"
          className="flex items-center gap-2 px-4 py-2 rounded-full border border-cream/20 bg-cream/5 hover:border-ember/50 hover:bg-ember/10 transition-all duration-300 text-cream/75 hover:text-cream text-sm font-medium backdrop-blur-sm"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          <span>Member Login</span>
          <ArrowRight size={13} />
        </a>
      </div>

      {/* Main Content */}
      <motion.div
        style={{ y: contentY }}
          className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 pt-32 sm:pt-36 pb-12 sm:pb-16"
      >
        {/* Eyebrow badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, ease: easeOutCubic, delay: 0.15 }}
          className="inline-flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full border border-ember/35 bg-ember/8 mb-8 sm:mb-10 relative"
        >
          <motion.div
            className="absolute inset-0 rounded-full border border-ember/15"
            animate={{ scale: [1, 1.14, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          />
          <Zap size={13} className="text-ember" fill="currentColor" />
          <span
            className="text-[10px] sm:text-xs font-semibold tracking-[0.1em] sm:tracking-[0.15em] uppercase text-ember"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Founding Members — 4 of 50 Spots Filled
          </span>
        </motion.div>

        {/* Title */}
        <h1
          className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold leading-[1.0] tracking-tight mb-5 sm:mb-6"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          <AnimatedWords text="The" className="text-cream" delay={0.35} />
          <br />
          <AnimatedWords text="Contractor" className="text-ember" delay={0.55} />
          <br />
          <AnimatedWords text="Circle" className="text-cream" delay={0.75} />
        </h1>

        {/* Animated underline */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.3, delay: 1.1, ease: easeOutCubic }}
          className="w-28 h-[2px] mx-auto mb-8"
          style={{
            background: "linear-gradient(90deg, transparent, oklch(0.72 0.12 55), transparent)",
            transformOrigin: "center",
          }}
        />

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: easeOutCubic, delay: 0.95 }}
          className="text-base sm:text-xl md:text-2xl text-cream/80 font-light leading-relaxed mb-3 max-w-2xl mx-auto"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          The elite contractor community & execution engine led by{" "}
          <span className="text-cream font-semibold">Marshall Wilkinson</span>
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: easeOutCubic, delay: 1.1 }}
          className="text-sm sm:text-base text-cream/45 max-w-xl mx-auto mb-8 sm:mb-10 leading-relaxed"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Live coaching. Battle-tested systems. A network of operators who are actually building.
          <br className="hidden sm:block" />
          This is where serious contractors come to scale.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: easeOutCubic, delay: 1.35 }}
          className="relative inline-block mb-5"
        >
          <motion.div
            className="absolute inset-0 rounded-xl blur-2xl"
            style={{ background: "oklch(0.72 0.12 55 / 0.28)" }}
            animate={{ opacity: [0.28, 0.55, 0.28] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <button
            onClick={startCheckout}
            disabled={isLoading}
            className="relative inline-flex items-center gap-3 px-7 sm:px-10 py-4 sm:py-5 bg-ember hover:bg-ember-light text-midnight font-bold text-base sm:text-lg rounded-xl transition-all duration-300 hover:scale-[1.04] shadow-[0_0_40px_oklch(0.72_0.12_55/0.25)] disabled:opacity-70 disabled:cursor-wait cursor-pointer"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Redirecting to Checkout...
              </>
            ) : (
              <>
                Claim Your Founding Spot
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.7, duration: 0.8 }}
          className="text-xs text-cream/30 mb-6"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          $497/mo · Cancel anytime · Founding rate locked forever
        </motion.p>

        {/* Next Call Badge */}
        <div className="mb-14">
          <NextCallBadge />
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.2, duration: 1.5 }}
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="flex flex-col items-center gap-2"
          >
            <span
              className="text-[10px] tracking-[0.3em] uppercase text-cream/20"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Scroll
            </span>
            <div className="w-[1px] h-8 bg-gradient-to-b from-cream/20 to-transparent" />
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Transformation Ticker — bottom of hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.9, duration: 0.8 }}
        className="relative z-10 w-full"
      >
        <TransformationTicker />
      </motion.div>
    </section>
  );
}
