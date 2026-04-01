/**
 * Estimating Checklist Lead Magnet Landing Page
 * 
 * Mobile-first, high-converting single-purpose page.
 * 99%+ traffic from social media = mobile devices.
 * Form above the fold on mobile. Single column stacking.
 * 
 * Route: /estimating
 */

import { motion } from "framer-motion";
import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const PDF_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663332724241/JYLdJEaFQZebZwtiasWNpQ/Construction_Estimating_Checklist_8888fab8.pdf";

// ─── Animated Background ─────────────────────────────────────────────────
function LandingBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      <div
        className="absolute -top-32 -right-32 w-[400px] h-[400px] rounded-full"
        style={{
          background: "radial-gradient(circle, oklch(0.72 0.12 55 / 0.08), transparent 70%)",
        }}
      />
      <div
        className="absolute -bottom-48 -left-48 w-[400px] h-[400px] rounded-full"
        style={{
          background: "radial-gradient(circle, oklch(0.65 0.15 250 / 0.04), transparent 70%)",
        }}
      />
    </div>
  );
}

// ─── Email Capture Form ──────────────────────────────────────────────────
function CaptureForm({
  firstName,
  setFirstName,
  email,
  setEmail,
  isSubmitting,
  onSubmit,
}: {
  firstName: string;
  setFirstName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label className="block text-[11px] font-heading uppercase tracking-widest text-cream-muted/70 mb-1.5 pl-1">
          First Name
        </label>
        <input
          type="text"
          placeholder="Your first name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
          className="w-full h-12 px-4 rounded-xl text-base text-cream placeholder:text-cream-muted/40 outline-none transition-all duration-200 focus:ring-2 focus:ring-ember/40"
          style={{
            background: "oklch(0.12 0.02 260)",
            border: "1px solid oklch(0.72 0.12 55 / 0.2)",
          }}
        />
      </div>
      <div>
        <label className="block text-[11px] font-heading uppercase tracking-widest text-cream-muted/70 mb-1.5 pl-1">
          Email Address
        </label>
        <input
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full h-12 px-4 rounded-xl text-base text-cream placeholder:text-cream-muted/40 outline-none transition-all duration-200 focus:ring-2 focus:ring-ember/40"
          style={{
            background: "oklch(0.12 0.02 260)",
            border: "1px solid oklch(0.72 0.12 55 / 0.2)",
          }}
        />
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full h-14 rounded-xl font-heading font-bold text-base tracking-wide transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
        style={{
          background: isSubmitting
            ? "oklch(0.55 0.08 55)"
            : "linear-gradient(135deg, oklch(0.65 0.15 55), oklch(0.72 0.12 55))",
          color: "#08090D",
          boxShadow: isSubmitting ? "none" : "0 4px 20px oklch(0.72 0.12 55 / 0.3)",
        }}
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Sending...
          </span>
        ) : (
          "Get the Free Checklist →"
        )}
      </button>
      <p className="text-center text-[11px] text-cream-muted/40 pt-1">
        No spam. Instant download. Unsubscribe anytime.
      </p>
    </form>
  );
}

// ─── Checklist Section Point ─────────────────────────────────────────────
function ChecklistPoint({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3 items-start">
      <div className="shrink-0 w-9 h-9 rounded-lg bg-ember/15 border border-ember/30 flex items-center justify-center">
        <span className="font-heading font-bold text-ember text-xs">{number}</span>
      </div>
      <div className="min-w-0">
        <h3 className="font-heading font-semibold text-cream text-[15px] mb-0.5">{title}</h3>
        <p className="text-cream-muted/70 text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

// ─── Main Landing Page ───────────────────────────────────────────────────
export default function EstimatingChecklist() {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [, navigate] = useLocation();

  const captureLead = trpc.leads.capture.useMutation({
    onSuccess: () => {
      navigate(`/estimating/thank-you?name=${encodeURIComponent(firstName)}`);
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
      source: "estimating-checklist",
    });
  };

  return (
    <div className="min-h-screen bg-navy-deep relative overflow-x-hidden">
      <LandingBackground />

      {/* Gradient bar at top */}
      <div
        className="h-1 w-full fixed top-0 z-50"
        style={{
          background: "linear-gradient(90deg, oklch(0.55 0.12 55), oklch(0.72 0.12 55), oklch(0.82 0.10 55))",
        }}
      />

      <div className="relative z-10">
        {/* ─── Nav ─────────────────────────────────────────────── */}
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
            Learn More
          </a>
        </nav>

        {/* ═══════════════════════════════════════════════════════
            MOBILE LAYOUT: Badge → Headline → Form → Content
            DESKTOP LAYOUT: Two-column grid (copy left, form right)
            ═══════════════════════════════════════════════════════ */}
        <section className="max-w-5xl mx-auto px-4 pt-4 pb-8 sm:pt-8 sm:pb-16 lg:pt-16 lg:pb-24">

          {/* ─── Mobile: Badge + Headline (shown above form on mobile) ─── */}
          <div className="lg:hidden text-center mb-6">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ember/10 border border-ember/25 mb-4"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-ember animate-pulse" />
              <span className="text-[10px] font-heading uppercase tracking-widest text-ember font-medium">
                Free Estimating Checklist
              </span>
            </motion.div>

            {/* Mobile Headline */}
            <motion.h1
              className="font-heading font-bold text-cream leading-[1.1] mb-3"
              style={{ fontSize: "clamp(1.6rem, 7vw, 2rem)" }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, duration: 0.4 }}
            >
              Stop Estimating<br />
              <span className="text-ember">From Memory.</span>
            </motion.h1>

            {/* Mobile Subheadline */}
            <motion.p
              className="text-cream-muted/80 text-sm leading-relaxed mb-2 max-w-xs mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              The 7-page estimating system built from $2.5B in construction experience.
            </motion.p>
          </div>

          {/* ─── Mobile: Form Card (ABOVE THE FOLD) ─── */}
          <motion.div
            className="lg:hidden mb-8"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
          >
            <div
              className="rounded-2xl p-5 relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, oklch(0.16 0.02 260), oklch(0.13 0.02 260))",
                border: "1px solid oklch(0.72 0.12 55 / 0.15)",
                boxShadow: "0 0 60px oklch(0.72 0.12 55 / 0.06), 0 20px 40px -12px rgba(0,0,0,0.4)",
              }}
            >
              <div className="text-center mb-5">
                <h2 className="font-heading font-bold text-cream text-lg mb-1">
                  Download the Checklist
                </h2>
                <p className="text-cream-muted/60 text-xs">
                  Enter your info below and get instant access.
                </p>
              </div>
              <CaptureForm
                firstName={firstName}
                setFirstName={setFirstName}
                email={email}
                setEmail={setEmail}
                isSubmitting={isSubmitting}
                onSubmit={handleSubmit}
              />
            </div>
          </motion.div>

          {/* ─── Mobile: Authority Stats (compact row) ─── */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="text-center">
              <span className="block font-heading font-bold text-ember text-base">$2.5B+</span>
              <span className="text-cream-muted/50 text-[10px] uppercase tracking-wider">Construction</span>
            </div>
            <div className="w-px h-6 bg-ember/20" />
            <div className="text-center">
              <span className="block font-heading font-bold text-ember text-base">7 Pages</span>
              <span className="text-cream-muted/50 text-[10px] uppercase tracking-wider">Checklist</span>
            </div>
            <div className="w-px h-6 bg-ember/20" />
            <div className="text-center">
              <span className="block font-heading font-bold text-ember text-base">8</span>
              <span className="text-cream-muted/50 text-[10px] uppercase tracking-wider">Sections</span>
            </div>
          </div>

          {/* ─── Mobile: What's Inside ─── */}
          <div className="lg:hidden space-y-4 mb-8">
            <p className="text-[10px] font-heading uppercase tracking-widest text-ember/70 mb-1">
              Inside the Checklist
            </p>
            <ChecklistPoint
              number="01"
              title="Contract Document Review"
              description="Drawings, specs, addenda — make sure you're pricing the right scope before anything else."
            />
            <ChecklistPoint
              number="02"
              title="Site Visit & Field Conditions"
              description="Access, staging, utilities, restrictions. The stuff that blows up your budget if you miss it."
            />
            <ChecklistPoint
              number="03"
              title="Exclusions & Clarifications"
              description="Define what's out before you price what's in. Protect your margins from day one."
            />
            <ChecklistPoint
              number="04"
              title="Quantity Takeoff & Pricing"
              description="Material quantities, vendor quotes, waste factors — organized by CSI division."
            />
          </div>

          {/* ─── Mobile: Quote ─── */}
          <div className="lg:hidden mb-8">
            <div
              className="rounded-2xl p-5 relative"
              style={{
                background: "linear-gradient(135deg, oklch(0.14 0.02 260), oklch(0.11 0.02 260))",
                border: "1px solid oklch(0.72 0.12 55 / 0.08)",
              }}
            >
              <div className="text-ember/30 text-3xl font-serif leading-none mb-2">"</div>
              <p className="text-cream/90 text-sm italic leading-relaxed mb-3">
                The contractors who win consistently aren't guessing — they're following a system. Every missed line item is money you're leaving on the table or eating out of your margin.
              </p>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-ember/20 flex items-center justify-center">
                  <span className="text-ember text-xs font-bold">MW</span>
                </div>
                <div>
                  <p className="text-cream text-xs font-semibold">Marshall Wilkinson</p>
                  <p className="text-cream-muted/50 text-[10px]">Founder, ALP | $2.5B+ in Construction</p>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════
              DESKTOP LAYOUT (lg and up): Two-column grid
              ═══════════════════════════════════════════════════════ */}
          <div className="hidden lg:grid lg:grid-cols-2 gap-16 items-start">
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
                  Free Estimating Checklist
                </span>
              </motion.div>

              {/* Headline */}
              <motion.h1
                className="font-heading font-bold text-cream mb-4 leading-[1.1]"
                style={{ fontSize: "clamp(2rem, 4vw, 3.25rem)" }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.6 }}
              >
                Stop Estimating From Memory.{" "}
                <span className="text-ember">Start Estimating From a System.</span>
              </motion.h1>

              {/* Subheadline */}
              <motion.p
                className="text-cream-muted text-base leading-relaxed mb-6 max-w-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                The 7-page checklist that covers every phase of a construction estimate — from contract review to final markup.
                Built from $2.5 billion in construction experience.
              </motion.p>

              {/* Authority stats */}
              <motion.div
                className="flex items-center gap-0 mb-8 -ml-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35, duration: 0.6 }}
              >
                <div className="flex flex-col items-center gap-1 px-4 py-2">
                  <span className="font-heading font-bold text-ember text-xl">$2.5B+</span>
                  <span className="text-cream-muted text-xs tracking-wide uppercase">In Construction</span>
                </div>
                <div className="w-px h-8 bg-ember/20" />
                <div className="flex flex-col items-center gap-1 px-4 py-2">
                  <span className="font-heading font-bold text-ember text-xl">8</span>
                  <span className="text-cream-muted text-xs tracking-wide uppercase">Sections</span>
                </div>
                <div className="w-px h-8 bg-ember/20" />
                <div className="flex flex-col items-center gap-1 px-4 py-2">
                  <span className="font-heading font-bold text-ember text-xl">Free</span>
                  <span className="text-cream-muted text-xs tracking-wide uppercase">Download</span>
                </div>
              </motion.div>

              {/* What's inside */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.6 }}
              >
                <p className="text-xs font-heading uppercase tracking-widest text-ember/70 mb-4">
                  Inside the Checklist
                </p>
                <div className="space-y-3">
                  <ChecklistPoint
                    number="01"
                    title="Contract Document Review"
                    description="Drawings, specs, addenda — make sure you're pricing the right scope before anything else."
                  />
                  <ChecklistPoint
                    number="02"
                    title="Site Visit & Field Conditions"
                    description="Access, staging, utilities, restrictions. The stuff that blows up your budget if you miss it."
                  />
                  <ChecklistPoint
                    number="03"
                    title="Exclusions & Clarifications"
                    description="Define what's out before you price what's in. Protect your margins from day one."
                  />
                  <ChecklistPoint
                    number="04"
                    title="Quantity Takeoff & Pricing"
                    description="Material quantities, vendor quotes, waste factors — organized by CSI division."
                  />
                </div>
              </motion.div>
            </div>

            {/* Right: Form Card (Desktop) */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="sticky top-24"
            >
              <div
                className="rounded-2xl p-8 relative overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, oklch(0.16 0.02 260), oklch(0.13 0.02 260))",
                  border: "1px solid oklch(0.72 0.12 55 / 0.15)",
                  boxShadow: "0 0 80px oklch(0.72 0.12 55 / 0.06), 0 25px 50px -12px rgba(0,0,0,0.5)",
                }}
              >
                <div
                  className="absolute top-0 right-0 w-32 h-32 pointer-events-none"
                  style={{
                    background: "radial-gradient(circle at top right, oklch(0.72 0.12 55 / 0.08), transparent 70%)",
                  }}
                />
                <div className="relative z-10">
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ember/10 border border-ember/20 mb-4">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="oklch(0.72 0.12 55)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                        <rect x="9" y="3" width="6" height="4" rx="1" />
                        <path d="M9 14l2 2 4-4" />
                      </svg>
                      <span className="text-[10px] font-heading uppercase tracking-widest text-ember/80">
                        7-Page Estimating System
                      </span>
                    </div>
                    <h2 className="font-heading font-bold text-cream text-2xl mb-2">
                      Download the Checklist
                    </h2>
                    <p className="text-cream-muted/60 text-sm">
                      Enter your info below and get instant access.
                    </p>
                  </div>
                  <CaptureForm
                    firstName={firstName}
                    setFirstName={setFirstName}
                    email={email}
                    setEmail={setEmail}
                    isSubmitting={isSubmitting}
                    onSubmit={handleSubmit}
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ─── Additional Sections (Desktop) ─── */}
        <section className="hidden lg:block max-w-5xl mx-auto px-5 pb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-4 gap-4"
          >
            {[
              { num: "05", title: "Labor & Man-Hours", desc: "Crew compositions, production rates, fully burdened rates" },
              { num: "06", title: "Sub Management", desc: "2-3 quotes per trade, scope leveling, hold dates" },
              { num: "07", title: "General Conditions", desc: "PM time, temp facilities, bonds, insurance, permits" },
              { num: "08", title: "Escalation & Market", desc: "Volatile materials, price protection, quote expirations" },
            ].map((item) => (
              <div
                key={item.num}
                className="rounded-xl p-5"
                style={{
                  background: "oklch(0.14 0.02 260)",
                  border: "1px solid oklch(0.72 0.12 55 / 0.08)",
                }}
              >
                <span className="font-heading font-bold text-ember text-lg">{item.num}</span>
                <h4 className="font-heading font-semibold text-cream text-sm mt-1 mb-1">{item.title}</h4>
                <p className="text-cream-muted/60 text-xs leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </motion.div>
        </section>

        {/* ─── Quote Section (Desktop only) ─── */}
        <section className="hidden lg:block max-w-3xl mx-auto px-5 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="rounded-2xl p-10 text-center relative"
            style={{
              background: "linear-gradient(135deg, oklch(0.14 0.02 260), oklch(0.11 0.02 260))",
              border: "1px solid oklch(0.72 0.12 55 / 0.08)",
            }}
          >
            <div className="text-ember/30 text-5xl font-serif leading-none mb-4">"</div>
            <p className="text-cream/90 text-lg italic leading-relaxed mb-6 max-w-xl mx-auto">
              The contractors who win consistently aren't guessing — they're following a system. Every missed line item is money you're leaving on the table or eating out of your margin.
            </p>
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-full bg-ember/20 flex items-center justify-center">
                <span className="text-ember text-sm font-bold">MW</span>
              </div>
              <div className="text-left">
                <p className="text-cream text-sm font-semibold">Marshall Wilkinson</p>
                <p className="text-cream-muted/50 text-xs">Founder, ALP | $2.5B+ in Construction</p>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ─── Footer ─────────────────────────────────────────── */}
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
