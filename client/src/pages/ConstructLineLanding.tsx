/**
 * ConstructLine Landing Page — Professional marketing page at /constructline
 * Showcases ALP's proprietary construction tools with screenshots, feature
 * explanations, and a free signup funnel that leads into the beta portal.
 */
import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  Zap,
  Ruler,
  GanttChart,
  Database,
  CheckCircle2,
  Shield,
  Clock,
  Target,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConstructLineWordmark } from "@/components/ConstructLineBrand";

const HERO_IMAGE =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663332724241/JYLdJEaFQZebZwtiasWNpQ/marshall_hero.webp";

const SCHEDULER_SCREENSHOT =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663332724241/JYLdJEaFQZebZwtiasWNpQ/constructline-cpm-scheduler-screenshot-BZ2jFoyWuGfdzJpdQVwF4i.webp";

const TAKEOFF_SCREENSHOT =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663332724241/JYLdJEaFQZebZwtiasWNpQ/constructline-takeoff-screenshot-ZmNeNKsoHFWs9JR8RPF5iH.webp";

const easeOutCubic = [0.22, 1, 0.36, 1] as [number, number, number, number];

const TOOLS = [
  {
    icon: GanttChart,
    name: "CPM Scheduler",
    tagline: "Critical Path Method scheduling built for the field.",
    description:
      "Create professional CPM schedules with Gantt charts, task dependencies, and baseline tracking. The same methodology used on billion-dollar projects — now accessible to every contractor.",
    screenshot: SCHEDULER_SCREENSHOT,
    features: [
      "Drag-and-drop Gantt chart with dependency arrows",
      "Automatic critical path calculation",
      "Baseline tracking and schedule variance reporting",
      "Export-ready reports for owners and GCs",
    ],
  },
  {
    icon: Ruler,
    name: "Quantity Takeoff",
    tagline: "Measure plans. Generate quantities. Win more bids.",
    description:
      "Upload your blueprints and use professional-grade measurement tools — linear, area, count, and volume — to generate accurate quantity takeoffs directly from your plans.",
    screenshot: TAKEOFF_SCREENSHOT,
    features: [
      "Linear, area, count, and volume measurement tools",
      "Multi-page plan support with sheet navigation",
      "Real-time measurement summary with export",
      "Markup annotations and color-coded overlays",
    ],
  },
  {
    icon: Database,
    name: "Cost Library",
    tagline: "Your pricing database. Always current.",
    description:
      "Build and maintain a centralized cost library with your real-world pricing data. Reference it during takeoffs and estimates to produce accurate bids faster.",
    features: [
      "Organize costs by CSI division or custom categories",
      "Unit cost tracking with material + labor breakdown",
      "Import/export for team-wide consistency",
      "Integrates with Quantity Takeoff for instant estimates",
    ],
  },
];

const VALUE_PROPS = [
  {
    icon: Shield,
    title: "Built by Contractors",
    text: "Developed by ALP — $2.5B+ in construction experience. These aren't generic tools. They're built for how contractors actually work.",
  },
  {
    icon: Clock,
    title: "Save Hours Every Week",
    text: "Stop wrestling with spreadsheets and outdated software. ConstructLine tools are fast, intuitive, and purpose-built for construction.",
  },
  {
    icon: Target,
    title: "Win More Work",
    text: "Professional schedules and accurate takeoffs set you apart from competitors. Show owners you run a real operation.",
  },
];

export default function ConstructLineLanding() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    companyName: "",
  });
  const signupRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const imageScale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);
  const imageY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 0.5], [0.75, 0.95]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/beta/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Signup failed");
      }

      setLocation("/portal");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const scrollToSignup = () => {
    signupRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="min-h-screen bg-navy-deep text-cream">
      {/* ─── HERO ─── */}
      <section ref={heroRef} className="relative min-h-[90vh] flex flex-col overflow-hidden">
        {/* Parallax background */}
        <motion.div className="absolute inset-0 z-0" style={{ scale: imageScale, y: imageY }}>
          <img
            src={HERO_IMAGE}
            alt="Marshall Wilkinson"
            className="w-full h-full object-cover object-top"
          />
        </motion.div>

        {/* Overlay */}
        <motion.div
          className="absolute inset-0 z-[1]"
          style={{
            opacity: overlayOpacity,
            background: `linear-gradient(180deg,
              oklch(0.08 0.02 260 / 0.90) 0%,
              oklch(0.08 0.02 260 / 0.70) 30%,
              oklch(0.08 0.02 260 / 0.80) 60%,
              oklch(0.08 0.02 260 / 0.98) 100%
            )`,
          }}
        />
        <div
          className="absolute inset-0 z-[2] pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 50% 40%, transparent 25%, oklch(0.08 0.02 260 / 0.65) 100%)",
          }}
        />

        {/* Top Nav */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 sm:px-10 py-5">
          <div className="flex items-center gap-3">
            <span
              className="text-ember font-bold text-lg tracking-tight"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              ALP
            </span>
            <span className="text-cream/25 text-sm hidden sm:inline">|</span>
            <ConstructLineWordmark size="sm" showSubtitle={false} className="hidden sm:flex" />
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/constructline/login"
              className="text-cream/60 hover:text-cream text-sm transition-colors"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Sign In
            </a>
            <button
              onClick={scrollToSignup}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-ember/40 bg-ember/10 hover:bg-ember/20 transition-all duration-300 text-ember text-sm font-medium"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <span>Try Free</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 pt-28 pb-16">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, ease: easeOutCubic, delay: 0.15 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-ember/35 bg-ember/8 mb-8"
          >
            <Zap size={13} className="text-ember" fill="currentColor" />
            <span
              className="text-[10px] sm:text-xs font-semibold tracking-[0.15em] uppercase text-ember"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Proprietary Construction Tools by ALP
            </span>
          </motion.div>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: easeOutCubic, delay: 0.3 }}
          >
            <h1
              className="text-5xl sm:text-7xl md:text-8xl font-bold leading-[0.95] tracking-tight mb-6"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              <span className="text-cream">Construct</span>
              <span className="text-amber-400">Line</span>
            </h1>
          </motion.div>

          {/* Animated underline */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1.3, delay: 0.8, ease: easeOutCubic }}
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
            transition={{ duration: 1, ease: easeOutCubic, delay: 0.6 }}
            className="text-lg sm:text-2xl text-cream/80 font-light leading-relaxed mb-3 max-w-3xl mx-auto"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Professional construction-grade tools developed by{" "}
            <span className="text-cream font-semibold">ALP</span> for construction professionals
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: easeOutCubic, delay: 0.8 }}
            className="text-sm sm:text-base text-cream/45 max-w-xl mx-auto mb-10 leading-relaxed"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            CPM Scheduling. Quantity Takeoff. Cost Library.
            <br className="hidden sm:block" />
            Built on $2.5B+ in real construction experience. Try it free.
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: easeOutCubic, delay: 1 }}
            className="relative inline-block mb-8"
          >
            <motion.div
              className="absolute inset-0 rounded-xl blur-2xl"
              style={{ background: "oklch(0.72 0.12 55 / 0.28)" }}
              animate={{ opacity: [0.28, 0.55, 0.28] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            <button
              onClick={scrollToSignup}
              className="relative inline-flex items-center gap-3 px-8 sm:px-10 py-4 sm:py-5 bg-ember hover:bg-ember-light text-midnight font-bold text-base sm:text-lg rounded-xl transition-all duration-300 hover:scale-[1.04] shadow-[0_0_40px_oklch(0.72_0.12_55/0.25)] cursor-pointer"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Try ConstructLine Free
              <ArrowRight size={18} />
            </button>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="mt-auto"
          >
            <ChevronDown className="w-5 h-5 text-cream/20 animate-bounce" />
          </motion.div>
        </div>
      </section>

      {/* ─── VALUE PROPS ─── */}
      <section className="py-20 px-4 sm:px-6 border-t border-cream/[0.06]">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {VALUE_PROPS.map((prop, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.7, delay: i * 0.15, ease: easeOutCubic }}
                className="text-center md:text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-ember/10 flex items-center justify-center mb-5 mx-auto md:mx-0">
                  <prop.icon className="w-6 h-6 text-ember" />
                </div>
                <h3
                  className="text-lg font-bold text-cream mb-3"
                  style={{ fontFamily: "'Sora', sans-serif" }}
                >
                  {prop.title}
                </h3>
                <p className="text-cream/55 text-sm leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  {prop.text}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TOOLS SHOWCASE ─── */}
      {TOOLS.map((tool, i) => (
        <section
          key={tool.name}
          className={`py-20 sm:py-28 px-4 sm:px-6 ${i % 2 === 0 ? "" : "bg-midnight/40"}`}
        >
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.8, ease: easeOutCubic }}
              className={`grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center ${
                i % 2 !== 0 ? "lg:grid-flow-dense" : ""
              }`}
            >
              {/* Text */}
              <div className={i % 2 !== 0 ? "lg:col-start-2" : ""}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-ember/10 flex items-center justify-center">
                    <tool.icon className="w-5 h-5 text-ember" />
                  </div>
                  <span
                    className="text-xs font-semibold tracking-[0.15em] uppercase text-ember/70"
                    style={{ fontFamily: "'Sora', sans-serif" }}
                  >
                    ConstructLine
                  </span>
                </div>
                <h2
                  className="text-3xl sm:text-4xl font-bold text-cream mb-3 leading-tight"
                  style={{ fontFamily: "'Sora', sans-serif" }}
                >
                  {tool.name}
                </h2>
                <p
                  className="text-lg text-cream/60 mb-6 font-medium"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {tool.tagline}
                </p>
                <p
                  className="text-cream/50 text-sm leading-relaxed mb-8"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {tool.description}
                </p>
                <ul className="space-y-3">
                  {tool.features.map((feat, j) => (
                    <li key={j} className="flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 text-ember mt-0.5 shrink-0" />
                      <span
                        className="text-sm text-cream/70"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      >
                        {feat}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Screenshot */}
              <div className={i % 2 !== 0 ? "lg:col-start-1" : ""}>
                {tool.screenshot ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.8, delay: 0.2, ease: easeOutCubic }}
                    className="relative group"
                  >
                    {/* Glow */}
                    <div className="absolute -inset-4 rounded-2xl bg-ember/5 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    <div className="relative rounded-xl overflow-hidden border border-cream/10 shadow-2xl shadow-black/40">
                      <img
                        src={tool.screenshot}
                        alt={`${tool.name} interface`}
                        className="w-full h-auto"
                      />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.8, delay: 0.2, ease: easeOutCubic }}
                    className="relative rounded-xl overflow-hidden border border-cream/10 bg-midnight-card p-12 flex flex-col items-center justify-center min-h-[300px]"
                  >
                    <tool.icon className="w-16 h-16 text-ember/30 mb-4" />
                    <p className="text-cream/40 text-sm font-medium" style={{ fontFamily: "'Sora', sans-serif" }}>
                      Coming Soon
                    </p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        </section>
      ))}

      {/* ─── SOCIAL PROOF STRIP ─── */}
      <section className="py-12 px-4 border-y border-cream/[0.06] bg-midnight/30">
        <div className="max-w-4xl mx-auto text-center">
          <p
            className="text-cream/40 text-xs uppercase tracking-[0.2em] mb-6"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Developed by ALP — The Contractor Circle
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <p className="text-3xl font-bold text-ember" style={{ fontFamily: "'Sora', sans-serif" }}>
                $2.5B+
              </p>
              <p className="text-cream/40 text-sm mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                In construction experience
              </p>
            </div>
            <div>
              <p className="text-3xl font-bold text-ember" style={{ fontFamily: "'Sora', sans-serif" }}>
                100%
              </p>
              <p className="text-cream/40 text-sm mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Built for contractors
              </p>
            </div>
            <div>
              <p className="text-3xl font-bold text-ember" style={{ fontFamily: "'Sora', sans-serif" }}>
                Free
              </p>
              <p className="text-cream/40 text-sm mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                To try — no credit card
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SIGNUP SECTION ─── */}
      <section ref={signupRef} id="signup" className="py-20 sm:py-28 px-4 sm:px-6">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-ember/10 border border-ember/20 mb-6">
              <Zap className="w-3.5 h-3.5 text-ember" />
              <span
                className="text-xs font-semibold text-ember uppercase tracking-wider"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                Free Access — No Credit Card Required
              </span>
            </div>
            <h2
              className="text-3xl sm:text-4xl font-bold text-cream mb-4 leading-tight"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Try Construct<span className="text-amber-400">Line</span> Today
            </h2>
            <p
              className="text-cream/55 text-base leading-relaxed"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Create your free account and start using professional construction tools in under 60 seconds.
            </p>
          </div>

          {/* Signup Form */}
          <form onSubmit={handleSubmit} className="space-y-4 mb-8">
            {error && (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div>
              <Label htmlFor="name" className="text-cream text-sm font-medium mb-2 block">
                Full Name
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                required
                className="bg-white/5 border-white/10 text-cream placeholder:text-cream-muted/50 h-12"
              />
            </div>

            <div>
              <Label htmlFor="companyName" className="text-cream text-sm font-medium mb-2 block">
                Company <span className="text-cream/30">(Optional)</span>
              </Label>
              <Input
                id="companyName"
                name="companyName"
                type="text"
                placeholder="Your Construction Company"
                value={formData.companyName}
                onChange={handleChange}
                className="bg-white/5 border-white/10 text-cream placeholder:text-cream-muted/50 h-12"
              />
            </div>

            <div>
              <Label htmlFor="email" className="text-cream text-sm font-medium mb-2 block">
                Email Address
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                required
                className="bg-white/5 border-white/10 text-cream placeholder:text-cream-muted/50 h-12"
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-cream text-sm font-medium mb-2 block">
                Create Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="At least 6 characters"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
                className="bg-white/5 border-white/10 text-cream placeholder:text-cream-muted/50 h-12"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-ember hover:bg-ember-light text-midnight font-bold py-4 h-14 rounded-xl transition-all flex items-center justify-center gap-2 text-base shadow-[0_0_30px_oklch(0.72_0.12_55/0.2)]"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              {loading ? "Creating Account..." : "Get Free Access"}
              {!loading && <ArrowRight className="w-5 h-5" />}
            </Button>
          </form>

          {/* Login Link */}
          <div className="text-center mb-10">
            <p className="text-cream/40 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Already have an account?{" "}
              <button
                onClick={() => setLocation("/constructline/login")}
                className="text-ember hover:text-ember-light font-semibold transition-colors"
              >
                Sign in
              </button>
            </p>
          </div>

          {/* What you get */}
          <div className="p-6 rounded-xl bg-cream/[0.03] border border-cream/[0.08]">
            <p
              className="text-xs uppercase tracking-[0.15em] text-cream/30 mb-4"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              What's Included — Free
            </p>
            <ul className="space-y-3">
              {[
                "CPM Scheduler — Full access",
                "Quantity Takeoff — Full access",
                "Cost Library — Full access",
                "No credit card required",
                "No time limit",
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-ember shrink-0" />
                  <span className="text-sm text-cream/60" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ─── CONTRACTOR CIRCLE UPSELL ─── */}
      <section className="py-20 px-4 sm:px-6 bg-midnight/40 border-t border-cream/[0.06]">
        <div className="max-w-3xl mx-auto text-center">
          <p
            className="text-xs uppercase tracking-[0.2em] text-cream/30 mb-4"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Want the Full Package?
          </p>
          <h2
            className="text-3xl sm:text-4xl font-bold text-cream mb-4 leading-tight"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Join The Contractor Circle
          </h2>
          <p
            className="text-cream/50 text-base leading-relaxed mb-8 max-w-xl mx-auto"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            ConstructLine is just the beginning. Contractor Circle members get live coaching calls with Marshall Wilkinson, battle-tested templates, replay library, and the full ConstructLine suite — everything you need to scale your construction business.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <a
              href="/"
              className="inline-flex items-center gap-2 px-8 py-4 bg-ember hover:bg-ember-light text-midnight font-bold rounded-xl transition-all duration-300 hover:scale-[1.03] shadow-[0_0_30px_oklch(0.72_0.12_55/0.2)]"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Learn More — $97/mo
              <ArrowRight size={16} />
            </a>
          </div>
          <p className="text-cream/30 text-xs" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Cancel anytime. No contracts.
          </p>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="py-10 px-4 border-t border-cream/[0.06]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className="text-ember font-bold text-sm"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              ALP
            </span>
            <span className="text-cream/15 text-xs">|</span>
            <span className="text-cream/40 text-xs" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              ConstructLine — Proprietary Construction Tools
            </span>
          </div>
          <p className="text-cream/25 text-xs" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            &copy; {new Date().getFullYear()} ALP. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
