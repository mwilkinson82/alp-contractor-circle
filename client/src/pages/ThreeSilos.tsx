/**
 * Three Silos Framework Lead Magnet Landing Page
 * 
 * Mobile-first, high-converting single-purpose page.
 * 99%+ traffic from social media = mobile devices.
 * Form above the fold on mobile. Single column stacking.
 * 
 * Route: /silos
 */

import { motion } from "framer-motion";
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const PDF_URL = "https://alpcontractorcircle.com/manus-storage/ALP_Three_Silos_Framework_v3_b948d967.pdf";

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
          "Get the Free Framework →"
        )}
      </button>
      <p className="text-center text-[11px] text-cream-muted/40 pt-1">
        No spam. Instant download. Unsubscribe anytime.
      </p>
    </form>
  );
}

// ─── Silo Point ──────────────────────────────────────────────────────────
function SiloPoint({
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
export default function ThreeSilos() {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, navigate] = useLocation();

  const captureLead = trpc.leads.capture.useMutation({
    onSuccess: () => {
      navigate(`/silos/thank-you?name=${encodeURIComponent(firstName)}`);
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
      source: "three-silos-framework",
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
                Free Business Framework
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
              Stop Overcomplicating<br />
              <span className="text-ember">Your Business.</span>
            </motion.h1>

            {/* Mobile Subheadline */}
            <motion.p
              className="text-cream-muted/80 text-sm leading-relaxed mb-2 max-w-xs mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              The first-principles framework that breaks business down to three things that actually matter.
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
                  Download the Framework
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
              <span className="block font-heading font-bold text-ember text-base">5 Pages</span>
              <span className="text-cream-muted/50 text-[10px] uppercase tracking-wider">Framework</span>
            </div>
            <div className="w-px h-6 bg-ember/20" />
            <div className="text-center">
              <span className="block font-heading font-bold text-ember text-base">3</span>
              <span className="text-cream-muted/50 text-[10px] uppercase tracking-wider">Silos</span>
            </div>
          </div>

          {/* ─── Mobile: The Three Silos ─── */}
          <div className="lg:hidden space-y-4 mb-8">
            <p className="text-[10px] font-heading uppercase tracking-widest text-ember/70 mb-1">
              The Three Silos
            </p>
            <SiloPoint
              number="01"
              title="Attention — Generate Interest"
              description="Without visibility, you have no viability. Attention isn't just about clients — it's your primary recruiting tool."
            />
            <SiloPoint
              number="02"
              title="People — Deliver & Grow"
              description="Get the people first, then the money. Great vision without great people is irrelevant."
            />
            <SiloPoint
              number="03"
              title="Process — Systematize"
              description="You cannot scale beyond your own personal capacity until you extract your knowledge and turn it into a system."
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
                Business schools reward difficult complex behavior more than simple behavior, but simple behavior is more effective.
              </p>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-ember/20 flex items-center justify-center">
                  <span className="text-ember text-xs font-bold">WB</span>
                </div>
                <div>
                  <p className="text-cream text-xs font-semibold">Warren Buffett</p>
                  <p className="text-cream-muted/50 text-[10px]">Chairman & CEO, Berkshire Hathaway</p>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Mobile: Failure Stats ─── */}
          <div className="lg:hidden mb-8">
            <p className="text-[10px] font-heading uppercase tracking-widest text-ember/70 mb-3">
              Why Most Businesses Stall
            </p>
            <div className="space-y-2">
              {[
                { silo: "No Attention", rate: "35%", desc: "No market demand — nobody knows you exist" },
                { silo: "Wrong People", rate: "20%", desc: "Can't deliver, can't scale, can't retain talent" },
                { silo: "No Process", rate: "42%", desc: "Owner is the bottleneck — nothing is systematized" },
              ].map((item) => (
                <div
                  key={item.silo}
                  className="flex items-center gap-3 rounded-xl p-3"
                  style={{
                    background: "oklch(0.14 0.02 260)",
                    border: "1px solid oklch(0.72 0.12 55 / 0.06)",
                  }}
                >
                  <span className="shrink-0 font-heading font-bold text-ember text-lg w-12 text-center">{item.rate}</span>
                  <div className="min-w-0">
                    <span className="font-heading font-semibold text-cream text-sm">{item.silo}</span>
                    <p className="text-cream-muted/60 text-xs leading-snug">{item.desc}</p>
                  </div>
                </div>
              ))}
              <p className="text-cream-muted/30 text-[9px] text-center pt-1">
                Sources: U.S. Chamber of Commerce, CB Insights, U.S. Bureau of Labor Statistics
              </p>
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
                  Free Business Framework
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
                Stop Overcomplicating Your Business.{" "}
                <span className="text-ember">Master the Three Things That Actually Matter.</span>
              </motion.h1>

              {/* Subheadline */}
              <motion.p
                className="text-cream-muted text-base leading-relaxed mb-6 max-w-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                The Three Silos Framework is a first-principles approach to scaling any business.
                Attention. People. Process. Built from $2.5 billion in construction experience.
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
                  <span className="font-heading font-bold text-ember text-xl">3</span>
                  <span className="text-cream-muted text-xs tracking-wide uppercase">Silos</span>
                </div>
                <div className="w-px h-8 bg-ember/20" />
                <div className="flex flex-col items-center gap-1 px-4 py-2">
                  <span className="font-heading font-bold text-ember text-xl">Free</span>
                  <span className="text-cream-muted text-xs tracking-wide uppercase">Download</span>
                </div>
              </motion.div>

              {/* The Three Silos */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.6 }}
              >
                <p className="text-xs font-heading uppercase tracking-widest text-ember/70 mb-4">
                  The Three Silos
                </p>
                <div className="space-y-3">
                  <SiloPoint
                    number="01"
                    title="Attention — Generate Interest"
                    description="Without visibility, you have no viability. Attention isn't just about clients — it's your primary recruiting tool."
                  />
                  <SiloPoint
                    number="02"
                    title="People — Deliver & Grow"
                    description="Get the people first, then the money. Great vision without great people is irrelevant."
                  />
                  <SiloPoint
                    number="03"
                    title="Process — Systematize"
                    description="You cannot scale beyond your own personal capacity until you extract your knowledge and turn it into a system."
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
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 6v6l4 2" />
                      </svg>
                      <span className="text-[10px] font-heading uppercase tracking-widest text-ember/80">
                        5-Page Business Framework
                      </span>
                    </div>
                    <h2 className="font-heading font-bold text-cream text-2xl mb-2">
                      Download the Framework
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

        {/* ─── Failure Stats Section (Desktop) ─── */}
        <section className="hidden lg:block max-w-5xl mx-auto px-5 pb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-xs font-heading uppercase tracking-widest text-ember/70 mb-4">
              Why Most Businesses Stall
            </p>
            <div className="grid grid-cols-3 gap-4">
              {[
                { silo: "No Attention", rate: "35%", desc: "No market demand — nobody knows you exist" },
                { silo: "Wrong People", rate: "20%", desc: "Can't deliver, can't scale, can't retain talent" },
                { silo: "No Process", rate: "42%", desc: "Owner is the bottleneck — nothing is systematized" },
              ].map((item) => (
                <div
                  key={item.silo}
                  className="rounded-xl p-5"
                  style={{
                    background: "oklch(0.14 0.02 260)",
                    border: "1px solid oklch(0.72 0.12 55 / 0.08)",
                  }}
                >
                  <span className="font-heading font-bold text-ember text-2xl">{item.rate}</span>
                  <h4 className="font-heading font-semibold text-cream text-sm mt-1 mb-1">{item.silo}</h4>
                  <p className="text-cream-muted/60 text-xs leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
            <p className="text-cream-muted/30 text-[10px] text-center mt-3">
              Sources: U.S. Chamber of Commerce, CB Insights, U.S. Bureau of Labor Statistics
            </p>
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
              Business schools reward difficult complex behavior more than simple behavior, but simple behavior is more effective.
            </p>
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-full bg-ember/20 flex items-center justify-center">
                <span className="text-ember text-sm font-bold">WB</span>
              </div>
              <div className="text-left">
                <p className="text-cream text-sm font-semibold">Warren Buffett</p>
                <p className="text-cream-muted/50 text-xs">Chairman & CEO, Berkshire Hathaway</p>
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
