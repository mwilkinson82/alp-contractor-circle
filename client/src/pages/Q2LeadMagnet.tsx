/**
 * Q1→Q2 Framework Lead Magnet Landing Page
 * 
 * High-converting single-purpose page. Email capture → database → thank you page.
 * Dark/ember Contractor Circle aesthetic. Mobile-first.
 * 
 * Route: /q2
 */

import { motion } from "framer-motion";
import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const PDF_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663332724241/JYLdJEaFQZebZwtiasWNpQ/Q1_Q2_Framework_ALP_Contractor_Circle(1)_d31e2b1f.pdf";

// ─── Animated Background ──────────────────────────────────────────────────
function LandingBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {/* Top-right ember glow */}
      <motion.div
        className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full"
        style={{
          background: "radial-gradient(circle, oklch(0.72 0.12 55 / 0.08), transparent 70%)",
        }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Bottom-left subtle glow */}
      <motion.div
        className="absolute -bottom-48 -left-48 w-[600px] h-[600px] rounded-full"
        style={{
          background: "radial-gradient(circle, oklch(0.65 0.15 250 / 0.05), transparent 70%)",
        }}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

// ─── Stat Pill ────────────────────────────────────────────────────────────
function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-4 py-2">
      <span className="font-heading font-bold text-ember text-lg sm:text-xl">{value}</span>
      <span className="text-cream-muted text-xs tracking-wide uppercase">{label}</span>
    </div>
  );
}

// ─── Framework Point ──────────────────────────────────────────────────────
function FrameworkPoint({
  number,
  title,
  description,
  delay,
}: {
  number: string;
  title: string;
  description: string;
  delay: number;
}) {
  return (
    <motion.div
      className="flex gap-4 items-start"
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5 }}
    >
      <div className="shrink-0 w-10 h-10 rounded-xl bg-ember/15 border border-ember/30 flex items-center justify-center">
        <span className="font-heading font-bold text-ember text-sm">{number}</span>
      </div>
      <div>
        <h3 className="font-heading font-semibold text-cream text-base mb-1">{title}</h3>
        <p className="text-cream-muted text-sm leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
}

// ─── Main Landing Page ────────────────────────────────────────────────────
export default function Q2LeadMagnet() {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [, navigate] = useLocation();

  const captureLead = trpc.leads.capture.useMutation({
    onSuccess: (data) => {
      // Navigate to thank you page with name for personalization
      navigate(`/q2/thank-you?name=${encodeURIComponent(firstName)}`);
    },
    onError: (error) => {
      setIsSubmitting(false);
      toast.error("Something went wrong. Please try again.");
      console.error("[LeadCapture] Error:", error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !email.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }
    setIsSubmitting(true);
    captureLead.mutate({
      firstName: firstName.trim(),
      email: email.trim(),
      source: "q1-q2-framework",
    });
  };

  return (
    <div className="min-h-screen bg-navy-deep relative overflow-hidden">
      <LandingBackground />

      {/* Gradient bar at top */}
      <div
        className="h-1 w-full fixed top-0 z-50"
        style={{
          background: "linear-gradient(90deg, oklch(0.55 0.12 55), oklch(0.72 0.12 55), oklch(0.82 0.10 55))",
        }}
      />

      <div className="relative z-10">
        {/* ─── Nav ─────────────────────────────────────────────────── */}
        <nav className="max-w-5xl mx-auto px-5 py-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-heading font-bold text-cream text-sm tracking-wider">ALP</span>
            <span className="text-ember/40">|</span>
            <span className="font-heading text-cream-muted text-xs tracking-widest uppercase">
              Contractor Circle
            </span>
          </div>
          <a
            href="/"
            className="text-xs text-cream-muted hover:text-ember transition-colors font-heading tracking-wide"
          >
            Learn More
          </a>
        </nav>

        {/* ─── Hero Section ────────────────────────────────────────── */}
        <section className="max-w-5xl mx-auto px-5 pt-8 pb-16 sm:pt-16 sm:pb-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Copy */}
            <div>
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-ember/10 border border-ember/25 mb-6"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-ember animate-pulse" />
                <span className="text-xs font-heading uppercase tracking-widest text-ember font-medium">
                  Free Q2 Framework
                </span>
              </motion.div>

              {/* Headline */}
              <motion.h1
                className="font-heading font-bold text-cream mb-4 leading-[1.1]"
                style={{ fontSize: "clamp(2rem, 5vw, 3.25rem)" }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.6 }}
              >
                Q1 Is Your Data.{" "}
                <span className="text-ember">Q2 Is Your Decision.</span>
              </motion.h1>

              {/* Subheadline */}
              <motion.p
                className="text-cream-muted text-base sm:text-lg leading-relaxed mb-6 max-w-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                The framework for turning first-quarter lessons into second-quarter momentum. 
                Built from $2.5 billion in construction experience.
              </motion.p>

              {/* Authority stats */}
              <motion.div
                className="flex items-center gap-0 mb-8 -ml-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35, duration: 0.6 }}
              >
                <StatPill value="$2.5B+" label="In Construction" />
                <div className="w-px h-8 bg-ember/20" />
                <StatPill value="6" label="Page Framework" />
                <div className="w-px h-8 bg-ember/20" />
                <StatPill value="Free" label="Download" />
              </motion.div>

              {/* What's inside preview (desktop) */}
              <motion.div
                className="hidden lg:block"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.6 }}
              >
                <p className="text-xs font-heading uppercase tracking-widest text-ember/70 mb-4">
                  Inside the Framework
                </p>
                <div className="space-y-3">
                  <FrameworkPoint
                    number="01"
                    title="The Q1 Audit"
                    description="Read your own scorecard. Diagnose why Rocks missed — not just that they missed."
                    delay={0.5}
                  />
                  <FrameworkPoint
                    number="02"
                    title="Kill, Double, Fix"
                    description="Three tactical moves to make this week. Subtract before you add."
                    delay={0.6}
                  />
                  <FrameworkPoint
                    number="03"
                    title="The Q2 Commitment"
                    description="Your personal action plan. One thing to kill, one to double, one system to fix."
                    delay={0.7}
                  />
                </div>
              </motion.div>
            </div>

            {/* Right: Form Card */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <div
                className="rounded-2xl p-8 sm:p-10 relative overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, oklch(0.16 0.02 260), oklch(0.13 0.02 260))",
                  border: "1px solid oklch(0.72 0.12 55 / 0.15)",
                  boxShadow: "0 0 80px oklch(0.72 0.12 55 / 0.06), 0 25px 50px -12px rgba(0,0,0,0.5)",
                }}
              >
                {/* Subtle corner accent */}
                <div
                  className="absolute top-0 right-0 w-32 h-32 pointer-events-none"
                  style={{
                    background: "radial-gradient(circle at top right, oklch(0.72 0.12 55 / 0.08), transparent 70%)",
                  }}
                />

                <div className="relative z-10">
                  {/* Form header */}
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ember/10 border border-ember/20 mb-4">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="oklch(0.72 0.12 55)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                      </svg>
                      <span className="text-xs font-heading text-ember tracking-wider uppercase">
                        End of Q1 Resource
                      </span>
                    </div>
                    <h2 className="font-heading font-bold text-cream text-xl sm:text-2xl mb-2">
                      Download the Framework
                    </h2>
                    <p className="text-cream-muted text-sm">
                      Enter your info below and get instant access.
                    </p>
                  </div>

                  {/* Form */}
                  <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-heading text-cream-muted uppercase tracking-wider mb-2">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Marshall"
                        required
                        className="w-full px-4 py-3 rounded-xl text-cream placeholder:text-cream-muted/40 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-ember/50 transition-all"
                        style={{
                          background: "oklch(0.10 0.01 270)",
                          border: "1px solid oklch(0.72 0.12 55 / 0.15)",
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-heading text-cream-muted uppercase tracking-wider mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="marshall@company.com"
                        required
                        className="w-full px-4 py-3 rounded-xl text-cream placeholder:text-cream-muted/40 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-ember/50 transition-all"
                        style={{
                          background: "oklch(0.10 0.01 270)",
                          border: "1px solid oklch(0.72 0.12 55 / 0.15)",
                        }}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3.5 rounded-xl font-heading font-semibold text-sm tracking-wide transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                      style={{
                        background: isSubmitting
                          ? "oklch(0.55 0.12 55)"
                          : "linear-gradient(135deg, oklch(0.72 0.12 55), oklch(0.62 0.12 55))",
                        color: "oklch(0.10 0.01 270)",
                        boxShadow: isSubmitting ? "none" : "0 4px 20px oklch(0.72 0.12 55 / 0.3)",
                      }}
                    >
                      {isSubmitting ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Sending...
                        </span>
                      ) : (
                        "Get the Q2 Framework →"
                      )}
                    </button>
                  </form>

                  {/* Trust line */}
                  <p className="text-center text-cream-muted/50 text-xs mt-4">
                    No spam. Instant download. Unsubscribe anytime.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ─── What's Inside (Mobile) ──────────────────────────────── */}
        <section className="lg:hidden max-w-5xl mx-auto px-5 pb-16">
          <p className="text-xs font-heading uppercase tracking-widest text-ember/70 mb-6">
            Inside the Framework
          </p>
          <div className="space-y-4">
            <FrameworkPoint
              number="01"
              title="The Q1 Audit"
              description="Read your own scorecard. Diagnose why Rocks missed — not just that they missed."
              delay={0.1}
            />
            <FrameworkPoint
              number="02"
              title="Kill, Double, Fix"
              description="Three tactical moves to make this week. Subtract before you add."
              delay={0.2}
            />
            <FrameworkPoint
              number="03"
              title="The Q2 Commitment"
              description="Your personal action plan. One thing to kill, one to double, one system to fix."
              delay={0.3}
            />
          </div>
        </section>

        {/* ─── Quote / Social Proof ────────────────────────────────── */}
        <section className="max-w-3xl mx-auto px-5 pb-16 sm:pb-24">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div
              className="rounded-2xl p-8 sm:p-12 relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, oklch(0.14 0.02 260), oklch(0.11 0.01 270))",
                border: "1px solid oklch(0.72 0.12 55 / 0.08)",
              }}
            >
              <svg
                className="mx-auto mb-4 text-ember/30"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
              </svg>
              <blockquote className="font-heading text-cream text-lg sm:text-xl leading-relaxed mb-6 italic">
                "The gap between the talkers and the doers opens up in Q2. While everyone else is still recovering from their New Year's resolutions, the operators are already executing."
              </blockquote>
              <div className="flex items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-full bg-ember/20 flex items-center justify-center">
                  <span className="font-heading font-bold text-ember text-sm">MW</span>
                </div>
                <div className="text-left">
                  <p className="font-heading font-semibold text-cream text-sm">Marshall Wilkinson</p>
                  <p className="text-cream-muted text-xs">Founder, ALP | $2.5B+ in Construction</p>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ─── Footer ──────────────────────────────────────────────── */}
        <footer className="max-w-5xl mx-auto px-5 py-8 border-t border-white/5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-heading font-bold text-cream/60 text-xs tracking-wider">ALP</span>
              <span className="text-ember/30">|</span>
              <span className="text-cream-muted/40 text-xs">Contractor Circle</span>
            </div>
            <p className="text-cream-muted/40 text-xs">
              &copy; {new Date().getFullYear()} ALP. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
