/**
 * Three Silos Framework Thank You / Download Page
 * 
 * Route: /silos/thank-you
 * Mirrors EstimatingThankYou.tsx structure with Three Silos-specific copy.
 */

import { motion } from "framer-motion";
import { useSearch } from "wouter";

const PDF_URL = "https://alpcontractorcircle.com/manus-storage/ALP_Three_Silos_Framework_v3_fixed_1add3fd9.pdf";

export default function ThreeSilosThankYou() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const name = params.get("name") || "there";

  return (
    <div className="min-h-screen bg-navy-deep relative overflow-x-hidden">
      {/* Gradient bar */}
      <div
        className="h-1 w-full fixed top-0 z-50"
        style={{
          background: "linear-gradient(90deg, oklch(0.55 0.12 55), oklch(0.72 0.12 55), oklch(0.82 0.10 55))",
        }}
      />

      {/* Background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full"
          style={{
            background: "radial-gradient(circle, oklch(0.72 0.12 55 / 0.06), transparent 70%)",
          }}
        />
      </div>

      <div className="relative z-10">
        {/* Nav */}
        <nav className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-heading font-bold text-cream text-sm tracking-wider">ALP</span>
            <span className="text-ember/40 text-xs">|</span>
            <span className="font-heading text-cream-muted text-[11px] tracking-widest uppercase">
              Contractor Circle
            </span>
          </div>
          <a
            href="/"
            className="text-xs text-cream-muted hover:text-ember transition-colors font-heading tracking-wide"
          >
            Home
          </a>
        </nav>

        {/* Main Content */}
        <section className="max-w-xl mx-auto px-4 pt-12 pb-20 sm:pt-20 text-center">
          {/* Success Icon */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="w-16 h-16 rounded-full bg-ember/15 border border-ember/30 flex items-center justify-center mx-auto mb-6"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="oklch(0.72 0.12 55)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </motion.div>

          {/* Headline */}
          <motion.h1
            className="font-heading font-bold text-cream text-2xl sm:text-3xl mb-3"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
          >
            You're in, {name}.
          </motion.h1>

          <motion.p
            className="text-cream-muted text-base leading-relaxed mb-8 max-w-md mx-auto"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
          >
            Your Three Silos Framework is ready. We also sent a copy to your email.
          </motion.p>

          {/* Download CTA */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
          >
            <a
              href={PDF_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-heading font-bold text-base tracking-wide transition-all duration-300 active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, oklch(0.65 0.15 55), oklch(0.72 0.12 55))",
                color: "#08090D",
                boxShadow: "0 4px 20px oklch(0.72 0.12 55 / 0.3)",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download the Framework
            </a>
          </motion.div>

          {/* What's Inside Preview */}
          <motion.div
            className="mt-12 text-left"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            <div
              className="rounded-2xl p-6 sm:p-8"
              style={{
                background: "linear-gradient(135deg, oklch(0.14 0.02 260), oklch(0.11 0.02 260))",
                border: "1px solid oklch(0.72 0.12 55 / 0.08)",
              }}
            >
              <p className="text-[10px] font-heading uppercase tracking-widest text-ember/70 mb-4">
                Your Next 3 Moves
              </p>
              <div className="space-y-4">
                {[
                  {
                    num: "1",
                    title: "Read the framework.",
                    desc: "It's 5 pages. Takes 10 minutes. Understand the three silos before you try to fix anything.",
                  },
                  {
                    num: "2",
                    title: "Run the diagnostic checklist.",
                    desc: "Page 4. Be brutally honest. The boxes you can't check — that's where the real work is.",
                  },
                  {
                    num: "3",
                    title: "Identify your weakest silo.",
                    desc: "Attention, People, or Process. Pick one. Fix that first. One quarter, full focus.",
                  },
                ].map((step) => (
                  <div key={step.num} className="flex gap-3 items-start">
                    <div className="shrink-0 w-7 h-7 rounded-lg bg-ember/15 border border-ember/30 flex items-center justify-center">
                      <span className="font-heading font-bold text-ember text-xs">{step.num}</span>
                    </div>
                    <div>
                      <span className="font-heading font-semibold text-cream text-sm">{step.title}</span>{" "}
                      <span className="text-cream-muted/70 text-sm">{step.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Circle CTA */}
          <motion.div
            className="mt-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.6 }}
          >
            <div
              className="h-px w-16 mx-auto mb-6"
              style={{ background: "linear-gradient(90deg, transparent, oklch(0.72 0.12 55 / 0.4), transparent)" }}
            />
            <p className="text-cream-muted/60 text-sm mb-4">
              Want live coaching, more frameworks, and a community of operators scaling 7- and 8-figure businesses?
            </p>
            <a
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-heading font-semibold text-ember transition-all duration-200 hover:bg-ember/10"
              style={{
                border: "1px solid oklch(0.72 0.12 55 / 0.25)",
                background: "oklch(0.72 0.12 55 / 0.06)",
              }}
            >
              Explore The Contractor Circle →
            </a>
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="max-w-5xl mx-auto px-4 py-6 border-t border-white/5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-cream-muted/40">
            <span>© {new Date().getFullYear()} ALP Contractor Circle. All rights reserved.</span>
            <div className="flex items-center gap-4">
              <a href="/" className="hover:text-ember transition-colors">Home</a>
              <a href="/circle" className="hover:text-ember transition-colors">Join the Circle</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
