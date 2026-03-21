import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Check, Zap, Shield, ArrowRight, Loader2 } from "lucide-react";
import { useCircleCheckout } from "@/hooks/useCircleCheckout";

const included = [
  "Weekly group call with Marshall (Thursday evenings)",
  "Monthly deal reviews — get expert eyes on your proposals",
  "Monthly bootcamp — intensive deep-dive training",
  "Full template library — SOPs, contracts, spreadsheets",
  "Private Discord community — 24/7 access",
  "Complete replay library — never miss a session",
  "Founding member pricing locked in for life",
];

const easeOutCubic = [0.22, 1, 0.36, 1] as [number, number, number, number];

export function PricingSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const { startCheckout, isLoading } = useCircleCheckout();

  return (
    <section id="pricing" ref={ref} className="relative z-10 py-20 sm:py-28 px-6">
      <div className="max-w-2xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: easeOutCubic }}
          className="text-center mb-12"
        >
          <motion.p
            initial={{ opacity: 0, letterSpacing: "0.5em" }}
            animate={isInView ? { opacity: 1, letterSpacing: "0.2em" } : {}}
            transition={{ duration: 1, ease: easeOutCubic }}
            className="text-xs font-semibold uppercase text-ember mb-4"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Founding Member Pricing
          </motion.p>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-cream leading-tight"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Join The Circle
          </h2>
          <motion.div
            initial={{ scaleX: 0 }}
            animate={isInView ? { scaleX: 1 } : {}}
            transition={{ duration: 1, delay: 0.3, ease: easeOutCubic }}
            className="w-16 h-[2px] mx-auto mt-5"
            style={{
              background: "linear-gradient(90deg, transparent, oklch(0.72 0.12 55), transparent)",
              transformOrigin: "center",
            }}
          />
        </motion.div>

        {/* Pricing Card */}
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.92 }}
          animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 1, ease: easeOutCubic, delay: 0.2 }}
          className="relative"
        >
          {/* Animated glow border */}
          <motion.div
            className="absolute -inset-[1px] rounded-2xl opacity-60"
            style={{
              background: "linear-gradient(135deg, oklch(0.72 0.12 55 / 0.4), transparent 40%, transparent 60%, oklch(0.72 0.12 55 / 0.2))",
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
          <div className="absolute -inset-8 rounded-3xl blur-3xl pointer-events-none"
            style={{ background: "radial-gradient(ellipse at center, oklch(0.72 0.12 55 / 0.06), transparent 70%)" }}
          />

          <div className="relative rounded-2xl p-8 sm:p-10 bg-gradient-to-b from-cream/[0.04] to-midnight border border-ember/10 backdrop-blur-sm overflow-hidden">
            {/* Subtle inner glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-ember/40 to-transparent" />

            {/* Founding Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.6, ease: easeOutCubic, delay: 0.4 }}
              className="flex items-center justify-center mb-8"
            >
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-ember/10 border border-ember/25 relative">
                <motion.div
                  className="absolute inset-0 rounded-full border border-ember/15"
                  animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                />
                <Shield size={14} className="text-ember" />
                <span className="text-xs font-semibold tracking-wider uppercase text-ember" style={{ fontFamily: "'Sora', sans-serif" }}>
                  Founding Member — Price Locked Forever
                </span>
              </div>
            </motion.div>

            {/* Price — dramatic reveal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.8, ease: easeOutCubic, delay: 0.5 }}
              className="text-center mb-10"
            >
              <div className="flex items-baseline justify-center gap-1 relative">
                {/* Glow behind price */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-32 h-16 rounded-full bg-ember/10 blur-2xl" />
                </div>
                <span className="text-6xl sm:text-7xl font-bold text-cream relative" style={{ fontFamily: "'Sora', sans-serif" }}>
                  $497
                </span>
                <span className="text-xl text-cream/40 relative">/mo</span>
              </div>
              <p className="text-sm text-cream/40 mt-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Cancel anytime. No contracts. No commitments.
              </p>
            </motion.div>

            {/* Included List — staggered check reveals */}
            <div className="space-y-3.5 mb-10">
              {included.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -25 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.5, ease: easeOutCubic, delay: 0.6 + i * 0.07 }}
                  className="flex items-start gap-3 group"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={isInView ? { scale: 1 } : {}}
                    transition={{ duration: 0.3, ease: easeOutCubic, delay: 0.7 + i * 0.07 }}
                    className="w-5 h-5 rounded-full bg-ember/15 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-ember/25 transition-colors duration-300"
                  >
                    <Check size={12} className="text-ember" />
                  </motion.div>
                  <span className="text-sm sm:text-base text-cream/75 group-hover:text-cream transition-colors duration-300" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {item}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* CTA Button — with pulsing glow */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, ease: easeOutCubic, delay: 1.1 }}
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
                className="relative flex items-center justify-center gap-3 w-full py-5 bg-ember hover:bg-ember-light text-midnight font-bold text-base sm:text-lg rounded-xl transition-all duration-300 hover:scale-[1.02] shadow-[0_0_30px_oklch(0.72_0.12_55/0.15)] disabled:opacity-70 disabled:cursor-wait cursor-pointer"
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
                    Claim Your Founding Spot
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </motion.div>

            {/* Urgency Note */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ delay: 1.3, duration: 0.6 }}
              className="text-center text-xs text-cream/30 mt-5"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Limited founding member spots available. Once filled, price increases.
            </motion.p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
