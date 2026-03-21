import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { ArrowDown, Zap, Loader2 } from "lucide-react";
import { useCircleCheckout } from "@/hooks/useCircleCheckout";

const HERO_IMAGE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663332724241/F8sHs44hWg957N49MHxas2/marshall_hero_6c478c8c.webp";

// Cinematic text split animation — each word animates individually
function AnimatedWords({ text, className, delay = 0, style }: { text: string; className?: string; delay?: number; style?: React.CSSProperties }) {
  const words = text.split(" ");
  return (
    <span className={className} style={style}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 40, rotateX: 45 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{
            duration: 0.7,
            delay: delay + i * 0.08,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="inline-block mr-[0.25em]"
          style={{ perspective: "600px" }}
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
}

export function HeroSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { startCheckout, isLoading } = useCircleCheckout();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const imageScale = useTransform(scrollYProgress, [0, 1], [1, 1.2]);
  const imageY = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 0.5], [0.75, 0.95]);

  return (
    <section ref={ref} className="relative min-h-screen flex items-center justify-center overflow-hidden">
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

      {/* MUCH darker overlay — multiple layers for depth */}
      <motion.div
        className="absolute inset-0 z-[1]"
        style={{
          opacity: overlayOpacity,
          background: `
            linear-gradient(180deg, 
              oklch(0.08 0.02 260 / 0.85) 0%, 
              oklch(0.08 0.02 260 / 0.75) 30%, 
              oklch(0.08 0.02 260 / 0.80) 60%, 
              oklch(0.08 0.02 260 / 0.95) 100%
            )
          `,
        }}
      />
      {/* Additional vignette layer */}
      <div
        className="absolute inset-0 z-[2]"
        style={{
          background: "radial-gradient(ellipse at center, transparent 30%, oklch(0.08 0.02 260 / 0.6) 100%)",
        }}
      />

      {/* Animated grain/noise texture */}
      <div className="absolute inset-0 z-[3] opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundSize: "128px 128px",
        }}
      />

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-3xl mx-auto pt-24 pb-12">
        {/* Founding Members Badge — animated pulse */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-ember/40 bg-ember/10 mb-10 relative"
        >
          {/* Pulse ring */}
          <motion.div
            className="absolute inset-0 rounded-full border border-ember/20"
            animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <Zap size={14} className="text-ember" fill="currentColor" />
          <span className="text-xs font-semibold tracking-[0.15em] uppercase text-ember" style={{ fontFamily: "'Sora', sans-serif" }}>
            Founding Members — Limited Spots
          </span>
        </motion.div>

        {/* Title — cinematic word-by-word reveal */}
        <h1
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold leading-[1.0] tracking-tight mb-6"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          <AnimatedWords text="The" className="text-cream" delay={0.4} />
          <br />
          <AnimatedWords text="Contracting" className="text-ember" delay={0.6} />
          <br />
          <AnimatedWords text="Circle" className="text-cream" delay={0.8} />
        </h1>

        {/* Animated underline accent */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.2, delay: 1.2, ease: [0.22, 1, 0.36, 1] }}
          className="w-24 h-[2px] mx-auto mb-8"
          style={{
            background: "linear-gradient(90deg, transparent, oklch(0.72 0.12 55), transparent)",
            transformOrigin: "center",
          }}
        />

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 1.0 }}
          className="text-lg sm:text-xl md:text-2xl text-cream/80 font-light leading-relaxed mb-4 max-w-2xl mx-auto"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          The elite contractor community & execution engine led by{" "}
          <span className="text-cream font-semibold">Marshall Wilkinson</span>
        </motion.p>

        {/* Feature pills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 1.3, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-wrap justify-center gap-3 mb-10"
        >
          {["Weekly Calls", "Deal Reviews", "Templates", "Private Community"].map((item, i) => (
            <motion.span
              key={item}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.4 + i * 0.1 }}
              className="px-3 py-1.5 text-xs sm:text-sm text-cream/60 border border-cream/10 rounded-full bg-cream/5 backdrop-blur-sm"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              {item}
            </motion.span>
          ))}
        </motion.div>

        {/* CTA Button — with glow effect */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 1.6 }}
          className="relative inline-block"
        >
          {/* Glow behind button */}
          <motion.div
            className="absolute inset-0 rounded-xl blur-xl"
            style={{ background: "oklch(0.72 0.12 55 / 0.3)" }}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <button
            onClick={startCheckout}
            disabled={isLoading}
            className="relative inline-flex items-center gap-3 px-10 py-5 bg-ember hover:bg-ember-light text-midnight font-bold text-base sm:text-lg rounded-xl transition-all duration-300 hover:scale-[1.04] shadow-[0_0_30px_oklch(0.72_0.12_55/0.2)] disabled:opacity-70 disabled:cursor-wait cursor-pointer"
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
                <ArrowDown size={18} className="animate-bounce" />
              </>
            )}
          </button>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.5, duration: 1.5 }}
          className="mt-20"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="flex flex-col items-center gap-2"
          >
            <span className="text-[10px] tracking-[0.3em] uppercase text-cream/20" style={{ fontFamily: "'Sora', sans-serif" }}>
              Scroll
            </span>
            <div className="w-[1px] h-8 bg-gradient-to-b from-cream/20 to-transparent" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
