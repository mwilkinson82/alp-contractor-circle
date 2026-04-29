import { motion, useInView } from "framer-motion";
import { useRef } from "react";
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
  AlertTriangle,
  ChevronRight,
  Quote,
} from "lucide-react";
import { useCircleCheckout } from "@/hooks/useCircleCheckout";

// ─── Constants ──────────────────────────────────────────────────────────────

const HERO_BG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663332724241/JYLdJEaFQZebZwtiasWNpQ/join-hero-bg-N2SPQRVr2GxuLMV95ziskK.webp";
const FINAL_CTA_BG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663332724241/JYLdJEaFQZebZwtiasWNpQ/join-final-cta-bg-4Tsa58cYXEjotZNA2kyxVp.webp";

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const features = [
  { icon: Phone, title: "Bi-weekly live working calls", desc: "Bring the real issue. Leave with the next move." },
  { icon: Calendar, title: "Monthly implementation bootcamps", desc: "Deep-dive sessions on the systems that move the business." },
  { icon: Users, title: "Private Discord community", desc: "Daily access to members, questions, wins, and live discussion." },
  { icon: FileText, title: "35+ template library", desc: "SOPs, contracts, scorecards, and frameworks built from real operating experience." },
  { icon: Play, title: "Replay library", desc: "Every session recorded and organized for review." },
  { icon: Bot, title: "AI estimating takeoff tool", desc: "Upload plans, get quantities. Built for contractors." },
  { icon: MessageSquare, title: "Question submission before calls", desc: "Bring the situation before the call so it can be reviewed with context." },
  { icon: Compass, title: "Direct strategic guidance from Marshall", desc: "$2.5B+ in construction experience applied to your business live." },
];

const painPoints = [
  "Bad estimates still leak margin.",
  "People issues still stay vague.",
  "Referrals are still not a system.",
  "Processes still live in your head.",
  "Growth still depends too heavily on you.",
  "The same issues keep returning every week.",
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
  { passive: "Watch content alone", circle: "Bring real problems into the room" },
  { passive: "Take notes", circle: "Get decisions pressure-tested" },
  { passive: "Generic advice", circle: "Contractor-specific implementation" },
  { passive: "No accountability", circle: "Live rhythm, community, and follow-through" },
  { passive: "Theory", circle: "$2.5B construction perspective" },
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

// ─── Reusable CTA Button ────────────────────────────────────────────────────

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
        className="inline-flex items-center gap-2 px-8 py-4 border border-ember/40 text-ember font-semibold rounded-lg hover:bg-ember/10 transition-all duration-300 disabled:opacity-60 cursor-pointer"
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
            <ArrowRight size={16} />
          </>
        )}
      </button>
    );
  }

  return (
    <div className="relative inline-block">
      <motion.div
        className="absolute inset-0 rounded-xl blur-xl"
        style={{ background: "oklch(0.72 0.12 55 / 0.2)" }}
        animate={{ opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      <button
        onClick={startCheckout}
        disabled={isLoading}
        className="relative inline-flex items-center gap-3 px-10 py-5 bg-ember hover:bg-ember-light text-midnight font-bold text-lg rounded-xl transition-all duration-300 hover:scale-[1.02] shadow-[0_0_30px_oklch(0.72_0.12_55/0.15)] disabled:opacity-60 cursor-pointer"
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
            <ArrowRight size={18} />
          </>
        )}
      </button>
    </div>
  );
}

// ─── Section Divider ────────────────────────────────────────────────────────

function SectionDivider() {
  return (
    <div className="flex justify-center py-2">
      <div
        className="w-24 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, oklch(0.72 0.12 55 / 0.3), transparent)",
        }}
      />
    </div>
  );
}

// ─── Section 1: Hero ────────────────────────────────────────────────────────

function HeroSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });

  return (
    <section ref={ref} className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src={HERO_BG}
          alt=""
          className="w-full h-full object-cover"
          style={{ opacity: 0.35 }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, oklch(0.10 0.01 270 / 0.6) 0%, oklch(0.10 0.01 270 / 0.85) 60%, oklch(0.10 0.01 270) 100%)",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-3xl mx-auto px-6 text-center pt-20 pb-24">
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease }}
          className="mb-8"
        >
          <span
            className="inline-block px-5 py-2 rounded-full border border-ember/25 bg-ember/8 text-xs font-semibold tracking-[0.2em] uppercase text-ember"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            The Contractor Circle
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1, ease, delay: 0.15 }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-cream leading-[1.08] tracking-tight mb-6"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          Build the operating system your contracting business is missing.
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease, delay: 0.3 }}
          className="text-lg sm:text-xl text-cream/60 max-w-2xl mx-auto mb-10 leading-relaxed"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          The Contractor Circle is Marshall Wilkinson's private implementation environment for
          contractors who want sharper decisions, better systems, stronger accountability, and a
          business that does not depend on guesswork.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease, delay: 0.45 }}
          className="mb-4"
        >
          <CTAButton label="Join The Circle" />
        </motion.div>

        {/* Microcopy */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-sm text-cream/35"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          $497/mo · Founding rate locked while active · Cancel anytime
        </motion.p>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 0.3 } : {}}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="mt-16"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-6 h-10 mx-auto rounded-full border border-cream/20 flex items-start justify-center pt-2"
          >
            <div className="w-1 h-2 rounded-full bg-cream/40" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Section 2: Bridge ──────────────────────────────────────────────────────

function BridgeSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="relative py-20 sm:py-28 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <motion.p
          initial={{ opacity: 0, letterSpacing: "0.5em" }}
          animate={isInView ? { opacity: 1, letterSpacing: "0.2em" } : {}}
          transition={{ duration: 1, ease }}
          className="text-xs font-semibold uppercase text-ember mb-6"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          From Tool to System
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease, delay: 0.1 }}
          className="text-3xl sm:text-4xl md:text-5xl font-bold text-cream leading-tight mb-8"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          A checklist can help.
          <br />
          <span className="text-ember">A system changes the company.</span>
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease, delay: 0.2 }}
          className="space-y-5 text-base sm:text-lg text-cream/55 leading-relaxed"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          <p>
            You may have come here through the Estimator's Checklist, the Q2 Framework, or the
            Holy Grail of Scaling. Each one gives you a piece of the machine.
          </p>
          <p className="text-cream/70 font-medium">But a piece is not the machine.</p>
          <p>
            Inside Contractor Circle, those pieces get connected into a live operating rhythm:
            estimating, scorecards, meetings, templates, accountability, decision-making,
            planning, and execution.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Section 3: What the Circle Is ─────────────────────────────────────────

function WhatIsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="relative py-20 sm:py-28 px-6">
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, oklch(0.72 0.12 55 / 0.03), transparent 60%)",
        }}
      />

      <div className="max-w-5xl mx-auto relative">
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
            What You Get
          </p>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-cream leading-tight"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            This is not a course.
            <br />
            It is a live implementation room.
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, ease, delay: 0.1 + i * 0.06 }}
              className="group p-6 rounded-xl border border-cream/[0.06] bg-cream/[0.02] hover:bg-cream/[0.04] hover:border-ember/15 transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-lg bg-ember/10 border border-ember/20 flex items-center justify-center mb-4 group-hover:bg-ember/15 transition-colors">
                <f.icon size={18} className="text-ember" />
              </div>
              <h3
                className="text-sm font-bold text-cream mb-2 leading-snug"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                {f.title}
              </h3>
              <p
                className="text-xs text-cream/45 leading-relaxed"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {f.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Section 4: Why Now ─────────────────────────────────────────────────────

function WhyNowSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="relative py-20 sm:py-28 px-6">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease }}
          className="text-center mb-12"
        >
          <p
            className="text-xs font-semibold uppercase text-ember mb-4 tracking-[0.2em]"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            The Cost of Waiting
          </p>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-cream leading-tight"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            The problems do not go away because you downloaded the PDF.
          </h2>
        </motion.div>

        <div className="space-y-4 mb-12">
          {painPoints.map((point, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5, ease, delay: 0.15 + i * 0.07 }}
              className="flex items-start gap-4 group"
            >
              <div className="w-2 h-2 rounded-full bg-ember/60 mt-2.5 shrink-0 group-hover:bg-ember transition-colors" />
              <p
                className="text-base sm:text-lg text-cream/60 group-hover:text-cream/80 transition-colors"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {point}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease, delay: 0.6 }}
          className="text-center"
        >
          <CTAButton label="Get in the room" variant="outline" />
        </motion.div>
      </div>
    </section>
  );
}

// ─── Section 5: Proof ───────────────────────────────────────────────────────

function ProofSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="relative py-20 sm:py-28 px-6">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, oklch(0.72 0.12 55 / 0.04), transparent 60%)",
        }}
      />

      <div className="max-w-5xl mx-auto relative">
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
            Verified Member Results
          </p>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-cream leading-tight"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Real contractors. Real movement.
          </h2>
        </motion.div>

        {/* Proof cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-16">
          {proofCards.map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, ease, delay: 0.1 + i * 0.08 }}
              className="p-6 rounded-xl border border-ember/15 bg-gradient-to-br from-ember/[0.05] to-transparent relative overflow-hidden group"
            >
              {/* Corner glow */}
              <div
                className="absolute top-0 right-0 w-32 h-32 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background:
                    "radial-gradient(circle at top right, oklch(0.72 0.12 55 / 0.15), transparent 70%)",
                }}
              />

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp size={14} className="text-ember" />
                  <span
                    className="text-sm font-bold text-cream"
                    style={{ fontFamily: "'Sora', sans-serif" }}
                  >
                    {card.company}
                  </span>
                </div>
                <span
                  className="text-xl font-black text-ember"
                  style={{ fontFamily: "'Sora', sans-serif" }}
                >
                  {card.multiplier}
                </span>
              </div>

              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm text-cream/35 line-through">{card.before}</span>
                <ArrowRight size={12} className="text-ember/60" />
                <span
                  className="text-2xl font-bold text-ember"
                  style={{ fontFamily: "'Sora', sans-serif" }}
                >
                  {card.after}
                </span>
              </div>

              <p
                className="text-xs text-cream/35 uppercase tracking-wider"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                {card.period} with ALP
              </p>
            </motion.div>
          ))}

          {/* Summary card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, ease, delay: 0.5 }}
            className="p-6 rounded-xl border border-cream/[0.08] bg-cream/[0.02] flex flex-col justify-center text-center sm:col-span-2 lg:col-span-1"
          >
            <p
              className="text-4xl font-black text-cream mb-2"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              $100M+
            </p>
            <p className="text-sm text-cream/45" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Revenue generated across ALP member outcomes
            </p>
            <div className="w-12 h-px bg-ember/30 mx-auto my-4" />
            <p
              className="text-3xl font-black text-cream mb-2"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              $2.5B+
            </p>
            <p className="text-sm text-cream/45" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Construction experience behind the room
            </p>
          </motion.div>
        </div>

        {/* Testimonials */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, ease, delay: 0.6 + i * 0.1 }}
              className="p-6 rounded-xl border border-cream/[0.06] bg-cream/[0.02]"
            >
              <Quote size={16} className="text-ember/40 mb-3" />
              <p
                className="text-sm text-cream/60 leading-relaxed mb-4"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                "{t.quote}"
              </p>
              <p
                className="text-xs font-bold text-ember tracking-wider uppercase"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                — {t.name}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Section 6: What Makes This Different ───────────────────────────────────

function ComparisonSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="relative py-20 sm:py-28 px-6">
      <div className="max-w-4xl mx-auto">
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
            The Difference
          </p>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-cream leading-tight"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Most coaching gives you information.
            <br />
            <span className="text-ember">The Circle gives you operating pressure.</span>
          </h2>
        </motion.div>

        {/* Comparison table */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease, delay: 0.15 }}
          className="rounded-xl border border-cream/[0.08] overflow-hidden"
        >
          {/* Header */}
          <div className="grid grid-cols-2 bg-cream/[0.04]">
            <div className="p-4 sm:p-5 border-r border-cream/[0.06]">
              <p
                className="text-xs font-bold text-cream/40 uppercase tracking-wider"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                Passive Program
              </p>
            </div>
            <div className="p-4 sm:p-5">
              <p
                className="text-xs font-bold text-ember uppercase tracking-wider"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                Contractor Circle
              </p>
            </div>
          </div>

          {/* Rows */}
          {comparisonRows.map((row, i) => (
            <div
              key={i}
              className="grid grid-cols-2 border-t border-cream/[0.06]"
            >
              <div className="p-4 sm:p-5 border-r border-cream/[0.06] flex items-center gap-3">
                <X size={14} className="text-cream/20 shrink-0" />
                <span
                  className="text-sm text-cream/40"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {row.passive}
                </span>
              </div>
              <div className="p-4 sm:p-5 flex items-center gap-3">
                <Check size={14} className="text-ember shrink-0" />
                <span
                  className="text-sm text-cream/75 font-medium"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {row.circle}
                </span>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─── Section 7: Who It's For ────────────────────────────────────────────────

function QualificationSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="relative py-20 sm:py-28 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease }}
          className="text-center mb-14"
        >
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-cream leading-tight"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            This is for contractors who are done guessing.
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* For you */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, ease, delay: 0.15 }}
            className="p-8 rounded-xl border border-ember/15 bg-ember/[0.03]"
          >
            <p
              className="text-xs font-bold text-ember uppercase tracking-wider mb-6"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              For you if
            </p>
            <div className="space-y-4">
              {forYou.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Check size={16} className="text-ember mt-0.5 shrink-0" />
                  <span
                    className="text-sm text-cream/70"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Not for you */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, ease, delay: 0.25 }}
            className="p-8 rounded-xl border border-cream/[0.06] bg-cream/[0.02]"
          >
            <p
              className="text-xs font-bold text-cream/40 uppercase tracking-wider mb-6"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Not for you if
            </p>
            <div className="space-y-4">
              {notForYou.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <X size={16} className="text-cream/25 mt-0.5 shrink-0" />
                  <span
                    className="text-sm text-cream/45"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ─── Section 8: Objection Handling ──────────────────────────────────────────

function ObjectionSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="relative py-20 sm:py-28 px-6">
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

        <div className="space-y-5">
          {objections.map((obj, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, ease, delay: 0.1 + i * 0.08 }}
              className="p-6 rounded-xl border border-cream/[0.06] bg-cream/[0.02] hover:border-ember/15 transition-colors duration-300"
            >
              <div className="flex items-start gap-4">
                <AlertTriangle size={16} className="text-cream/25 mt-1 shrink-0" />
                <div>
                  <p
                    className="text-base font-bold text-cream/80 mb-2"
                    style={{ fontFamily: "'Sora', sans-serif" }}
                  >
                    "{obj.q}"
                  </p>
                  <p
                    className="text-sm text-ember/80 font-medium"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {obj.a}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Section 9: Pricing ─────────────────────────────────────────────────────

function PricingSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const { startCheckout, isLoading } = useCircleCheckout();

  return (
    <section id="pricing" ref={ref} className="relative py-20 sm:py-28 px-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease }}
          className="text-center mb-12"
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
            className="w-16 h-[2px] mx-auto mt-5"
            style={{
              background:
                "linear-gradient(90deg, transparent, oklch(0.72 0.12 55), transparent)",
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
          {/* Glow border */}
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

          <div className="absolute -inset-8 rounded-3xl blur-3xl pointer-events-none"
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
            <div className="text-center mb-10">
              <div className="flex items-baseline justify-center gap-1">
                <span
                  className="text-5xl sm:text-6xl lg:text-7xl font-bold text-cream"
                  style={{ fontFamily: "'Sora', sans-serif" }}
                >
                  $497
                </span>
                <span className="text-xl text-cream/40">/mo</span>
              </div>
              <p
                className="text-sm text-cream/40 mt-3"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Cancel anytime. Founding rate locked while your membership stays active.
              </p>
            </div>

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
                  <span
                    className="text-sm sm:text-base text-cream/75"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
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
                className="relative flex items-center justify-center gap-3 w-full py-5 bg-ember hover:bg-ember-light text-midnight font-bold text-base sm:text-lg rounded-xl transition-all duration-300 hover:scale-[1.02] shadow-[0_0_30px_oklch(0.72_0.12_55/0.15)] disabled:opacity-70 cursor-pointer"
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
                    Claim Founding Access
                    <ArrowRight size={18} />
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

// ─── Section 10: Final Close ────────────────────────────────────────────────

function FinalCloseSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="relative py-24 sm:py-32 px-6 overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <img src={FINAL_CTA_BG} alt="" className="w-full h-full object-cover" style={{ opacity: 0.2 }} />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, oklch(0.10 0.01 270) 0%, oklch(0.10 0.01 270 / 0.7) 50%, oklch(0.10 0.01 270) 100%)",
          }}
        />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease }}
          className="text-3xl sm:text-4xl md:text-5xl font-bold text-cream leading-tight mb-6"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          Stop collecting tools.
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

// ─── Footer ─────────────────────────────────────────────────────────────────

function JoinFooter() {
  return (
    <footer className="py-10 px-6 border-t border-cream/[0.06]">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p
          className="text-xs text-cream/25"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          &copy; {new Date().getFullYear()} ALP — Altitude Logic Pressure. All rights reserved.
        </p>
        <div className="flex items-center gap-6">
          <a
            href="/"
            className="text-xs text-cream/30 hover:text-cream/60 transition-colors"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Home
          </a>
          <a
            href="/portal"
            className="text-xs text-cream/30 hover:text-cream/60 transition-colors"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Member Login
          </a>
          <a
            href="https://instagram.com/realmarshallwilkinson"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-cream/30 hover:text-cream/60 transition-colors"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Instagram
          </a>
        </div>
      </div>
    </footer>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function JoinPage() {
  return (
    <div className="min-h-screen bg-background text-foreground grain-overlay">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div
          className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full blur-[200px]"
          style={{ background: "oklch(0.72 0.12 55 / 0.04)" }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full blur-[200px]"
          style={{ background: "oklch(0.65 0.12 240 / 0.03)" }}
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
