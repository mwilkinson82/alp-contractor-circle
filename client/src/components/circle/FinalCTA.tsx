import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Zap, ArrowRight, Loader2 } from "lucide-react";
import { useCircleCheckout } from "@/hooks/useCircleCheckout";

const easeOutCubic = [0.22, 1, 0.36, 1] as [number, number, number, number];

export function FinalCTA() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const { startCheckout, isLoading } = useCircleCheckout();

  return (
    <section ref={ref} className="relative z-10 py-20 sm:py-28 px-6 overflow-hidden">
      {/* Background glow */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ duration: 2 }}
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 50% 50%, oklch(0.72 0.12 55 / 0.04), transparent 60%)",
        }}
      />

      <div className="max-w-3xl mx-auto text-center relative">
        {/* Divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={isInView ? { scaleX: 1 } : {}}
          transition={{ duration: 1, ease: easeOutCubic }}
          className="h-px bg-gradient-to-r from-transparent via-ember/30 to-transparent mb-16"
          style={{ transformOrigin: "center" }}
        />

        <motion.p
          initial={{ opacity: 0, letterSpacing: "0.5em" }}
          animate={isInView ? { opacity: 1, letterSpacing: "0.2em" } : {}}
          transition={{ duration: 1, ease: easeOutCubic }}
          className="text-xs font-semibold uppercase text-ember mb-5"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          Stop Guessing. Start Executing.
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.9, ease: easeOutCubic, delay: 0.15 }}
          className="text-3xl sm:text-4xl md:text-5xl font-bold text-cream leading-tight mb-6"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          Your Competition Won't{" "}
          <span className="text-ember">Wait</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 25 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: easeOutCubic, delay: 0.3 }}
          className="text-base sm:text-lg text-cream/50 max-w-xl mx-auto mb-12 leading-relaxed"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Every week you're not in The Circle is a week of deals left on the table, problems solved the hard way, and growth that could have been faster. Founding member spots are limited.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: easeOutCubic, delay: 0.45 }}
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
            className="relative inline-flex items-center gap-3 px-10 py-5 bg-ember hover:bg-ember-light text-midnight font-bold text-base sm:text-lg rounded-xl transition-all duration-300 hover:scale-[1.04] shadow-[0_0_30px_oklch(0.72_0.12_55/0.15)] disabled:opacity-70 disabled:cursor-wait cursor-pointer"
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
                Claim Your Founding Spot — $497/mo
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="text-xs text-cream/25 mt-5"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Cancel anytime. No contracts. Founding rate locked forever.
        </motion.p>
      </div>
    </section>
  );
}
