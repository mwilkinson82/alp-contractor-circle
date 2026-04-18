/**
 * ConstructLine Landing Page — Professional marketing page at /constructline
 * Showcases ALP's proprietary construction tools with REAL application screenshots,
 * feature explanations, and a free signup funnel.
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
  BarChart3,
  FileText,
  Filter,
  Link2,
  DollarSign,
  Activity,
  TrendingUp,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConstructLineWordmark } from "@/components/ConstructLineBrand";

const HERO_IMAGE =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663332724241/JYLdJEaFQZebZwtiasWNpQ/marshall_hero.webp";

/* ─── Real application screenshots ─── */
const SCREENSHOTS = {
  schedulerGantt: "/manus-storage/cl-scheduler-gantt_7b0f4330.webp",
  schedulerResidence: "/manus-storage/cl-scheduler-residence_a252c7ab.webp",
  activityDetails: "/manus-storage/cl-activity-details_6394e4aa.webp",
  advancedFilters: "/manus-storage/cl-advanced-filters_2a29dfb1.webp",
  resourcesCost: "/manus-storage/cl-resources-cost_7e0dea57.webp",
  resourceAssignments: "/manus-storage/cl-resource-assignments_8acd1d08.webp",
  reportsFloat: "/manus-storage/cl-reports-float_09aa81fe.webp",
  reportsCashflow: "/manus-storage/cl-reports-cashflow_a8780773.webp",
  reportsHistogram: "/manus-storage/cl-reports-histogram_dab3be41.webp",
  scheduleHealth: "/manus-storage/cl-schedule-health_21b851b9.webp",
  // Quantity Takeoff screenshots
  takeoffDrawingSheets: "/manus-storage/cl-takeoff-drawing-sheets_9ec0b1b2.webp",
  takeoffDrawingViewer: "/manus-storage/cl-takeoff-drawing-viewer_61066ed5.webp",
  takeoffLineItems: "/manus-storage/cl-takeoff-line-items_5f13cf37.webp",
  takeoffBidCalculator: "/manus-storage/cl-takeoff-bid-calculator_f23d2c65.webp",
  takeoffItemDetail: "/manus-storage/cl-takeoff-item-detail_39ddf76d.webp",
  takeoffMeasurements: "/manus-storage/cl-takeoff-measurements_7548a1df.webp",
  takeoffItemMeasurements: "/manus-storage/cl-takeoff-item-measurements_c25f7b29.webp",
  takeoffConsolidateWorking: "/manus-storage/cl-takeoff-consolidate-working_6325e99f.webp",
};

const easeOutCubic = [0.22, 1, 0.36, 1] as [number, number, number, number];

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
              ALP Contractor Circle — Proprietary Tools
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

      {/* ═══════════════════════════════════════════════════════════════
          TOOL 1: CPM SCHEDULER — Full Showcase
      ═══════════════════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, ease: easeOutCubic }}
            className="text-center mb-16"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-ember/10 flex items-center justify-center">
                <GanttChart className="w-5 h-5 text-ember" />
              </div>
              <span
                className="text-xs font-semibold tracking-[0.15em] uppercase text-ember/70"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                ConstructLine
              </span>
            </div>
            <h2
              className="text-3xl sm:text-5xl font-bold text-cream mb-4 leading-tight"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              CPM Scheduler
            </h2>
            <p
              className="text-lg text-cream/60 max-w-2xl mx-auto leading-relaxed"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Critical Path Method scheduling built for the field. The same methodology used on billion-dollar projects — now accessible to every contractor.
            </p>
          </motion.div>

          {/* Main screenshot — Gantt chart */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, ease: easeOutCubic }}
            className="relative group mb-16"
          >
            <div className="absolute -inset-4 rounded-2xl bg-ember/5 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="relative rounded-xl overflow-hidden border border-cream/10 shadow-2xl shadow-black/40">
              <img
                src={SCREENSHOTS.schedulerGantt}
                alt="ConstructLine CPM Scheduler — Water Treatment Plant Gantt Chart"
                className="w-full h-auto"
              />
            </div>
            <p className="text-center text-cream/30 text-xs mt-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Full CPM schedule with Gantt chart, WBS hierarchy, and critical path highlighting
            </p>
          </motion.div>

          {/* Feature grid with screenshots */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            {/* Activity Details */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.7, ease: easeOutCubic }}
            >
              <div className="rounded-xl overflow-hidden border border-cream/10 shadow-xl shadow-black/30 mb-4">
                <img
                  src={SCREENSHOTS.activityDetails}
                  alt="Activity Details — edit properties, relationships, and schedule"
                  className="w-full h-auto"
                />
              </div>
              <div className="flex items-start gap-3">
                <Link2 className="w-5 h-5 text-ember mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-cream mb-1" style={{ fontFamily: "'Sora', sans-serif" }}>
                    Activity Details & Dependencies
                  </h4>
                  <p className="text-xs text-cream/50 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Edit every property — duration, WBS, constraints, bar color. Link predecessors and successors with FS, SS, FF, SF relationships and lag.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Advanced Filters */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.7, delay: 0.1, ease: easeOutCubic }}
            >
              <div className="rounded-xl overflow-hidden border border-cream/10 shadow-xl shadow-black/30 mb-4">
                <img
                  src={SCREENSHOTS.advancedFilters}
                  alt="Advanced Filters — filter by activity ID, WBS, critical path, float, dates, and activity codes"
                  className="w-full h-auto"
                />
              </div>
              <div className="flex items-start gap-3">
                <Filter className="w-5 h-5 text-ember mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-cream mb-1" style={{ fontFamily: "'Sora', sans-serif" }}>
                    Advanced Filtering
                  </h4>
                  <p className="text-xs text-cream/50 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Filter by activity ID, name, WBS, critical path, float range, date range, and activity codes. Isolate exactly what you need for any meeting.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Second main screenshot — Residence project */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, ease: easeOutCubic }}
            className="relative group mb-16"
          >
            <div className="absolute -inset-4 rounded-2xl bg-ember/5 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="relative rounded-xl overflow-hidden border border-cream/10 shadow-2xl shadow-black/40">
              <img
                src={SCREENSHOTS.schedulerResidence}
                alt="ConstructLine CPM Scheduler — Smith Residence with submittals, fabrication, and procurement tracking"
                className="w-full h-auto"
              />
            </div>
            <p className="text-center text-cream/30 text-xs mt-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Residential project with submittals, fabrication, and procurement tracking — from contract signing to final completion
            </p>
          </motion.div>

          {/* Resources & Cost Loading */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.7, ease: easeOutCubic }}
            >
              <div className="rounded-xl overflow-hidden border border-cream/10 shadow-xl shadow-black/30 mb-4">
                <img
                  src={SCREENSHOTS.resourcesCost}
                  alt="Resources & Cost Loading — define labor, equipment, materials with cost rates"
                  className="w-full h-auto"
                />
              </div>
              <div className="flex items-start gap-3">
                <DollarSign className="w-5 h-5 text-ember mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-cream mb-1" style={{ fontFamily: "'Sora', sans-serif" }}>
                    Resources & Cost Loading
                  </h4>
                  <p className="text-xs text-cream/50 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Define labor, equipment, materials, and subcontractors with cost rates. Track budgeted vs. actual costs across your entire project.
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.7, delay: 0.1, ease: easeOutCubic }}
            >
              <div className="rounded-xl overflow-hidden border border-cream/10 shadow-xl shadow-black/30 mb-4">
                <img
                  src={SCREENSHOTS.resourceAssignments}
                  alt="Resource Assignments — assign resources to activities and track budgeted vs actual costs"
                  className="w-full h-auto"
                />
              </div>
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-ember mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-cream mb-1" style={{ fontFamily: "'Sora', sans-serif" }}>
                    Resource Assignments
                  </h4>
                  <p className="text-xs text-cream/50 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Assign resources to activities with units/day. See budgeted costs calculated automatically. Track actual costs as work progresses.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Reports Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.7, ease: easeOutCubic }}
            className="mb-8"
          >
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-ember/8 border border-ember/20 mb-4">
                <BarChart3 className="w-3.5 h-3.5 text-ember" />
                <span className="text-xs font-semibold text-ember uppercase tracking-wider" style={{ fontFamily: "'Sora', sans-serif" }}>
                  Built-In Reports
                </span>
              </div>
              <h3
                className="text-2xl sm:text-3xl font-bold text-cream mb-3"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                Professional Reports — Ready to Print
              </h3>
              <p className="text-cream/50 text-sm max-w-xl mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Generate the reports owners and GCs actually ask for. Export to CSV or print directly.
              </p>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            {/* Total Float Report */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.7, ease: easeOutCubic }}
            >
              <div className="rounded-xl overflow-hidden border border-cream/10 shadow-xl shadow-black/30 mb-4">
                <img
                  src={SCREENSHOTS.reportsFloat}
                  alt="Total Float Report — activity-level float analysis with critical path identification"
                  className="w-full h-auto"
                />
              </div>
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-ember mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-cream mb-1" style={{ fontFamily: "'Sora', sans-serif" }}>
                    Total Float Report
                  </h4>
                  <p className="text-xs text-cream/50 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Activity-level float analysis. See total float, free float, critical path status, and early/late dates for every activity.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Cash Flow S-Curve */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.7, delay: 0.1, ease: easeOutCubic }}
            >
              <div className="rounded-xl overflow-hidden border border-cream/10 shadow-xl shadow-black/30 mb-4">
                <img
                  src={SCREENSHOTS.reportsCashflow}
                  alt="Cash Flow S-Curve — budgeted vs actual cost tracking over project duration"
                  className="w-full h-auto"
                />
              </div>
              <div className="flex items-start gap-3">
                <TrendingUp className="w-5 h-5 text-ember mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-cream mb-1" style={{ fontFamily: "'Sora', sans-serif" }}>
                    Cash Flow S-Curve
                  </h4>
                  <p className="text-xs text-cream/50 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Visualize project cash flow over time. Track budgeted vs. actual spending with weekly detail breakdowns.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Resource Histogram */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.7, ease: easeOutCubic }}
            >
              <div className="rounded-xl overflow-hidden border border-cream/10 shadow-xl shadow-black/30 mb-4">
                <img
                  src={SCREENSHOTS.reportsHistogram}
                  alt="Resource Histogram — weekly resource loading by trade across project duration"
                  className="w-full h-auto"
                />
              </div>
              <div className="flex items-start gap-3">
                <BarChart3 className="w-5 h-5 text-ember mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-cream mb-1" style={{ fontFamily: "'Sora', sans-serif" }}>
                    Resource Histogram
                  </h4>
                  <p className="text-xs text-cream/50 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    See weekly resource loading by trade. Plan manpower, identify overallocation, and level resources before you hit the field.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Schedule Health Score */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.7, delay: 0.1, ease: easeOutCubic }}
            >
              <div className="rounded-xl overflow-hidden border border-cream/10 shadow-xl shadow-black/30 mb-4">
                <img
                  src={SCREENSHOTS.scheduleHealth}
                  alt="Schedule Health Score — automated schedule quality assessment with grading"
                  className="w-full h-auto"
                />
              </div>
              <div className="flex items-start gap-3">
                <Activity className="w-5 h-5 text-ember mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-cream mb-1" style={{ fontFamily: "'Sora', sans-serif" }}>
                    Schedule Health Score
                  </h4>
                  <p className="text-xs text-cream/50 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Automated schedule quality assessment. Grades your schedule on float distribution, critical path integrity, logic density, resource balance, and progress.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* CPM Feature bullets */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: easeOutCubic }}
            className="max-w-2xl mx-auto"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                "Drag-and-drop Gantt chart",
                "Automatic critical path calculation",
                "Baseline tracking & variance",
                "WBS hierarchy with color coding",
                "Day/Week/Month zoom views",
                "CSV import & export",
                "DD & Set data date",
                "Print-ready PDF reports",
              ].map((feat, j) => (
                <div key={j} className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-ember shrink-0" />
                  <span className="text-sm text-cream/60" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {feat}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          TOOL 2: QUANTITY TAKEOFF
      ═══════════════════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 bg-midnight/40">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, ease: easeOutCubic }}
            className="text-center mb-16"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-ember/10 flex items-center justify-center">
                <Ruler className="w-5 h-5 text-ember" />
              </div>
              <span
                className="text-xs font-semibold tracking-[0.15em] uppercase text-ember/70"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                ConstructLine
              </span>
            </div>
            <h2
              className="text-3xl sm:text-5xl font-bold text-cream mb-4 leading-tight"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Quantity Takeoff
            </h2>
            <p
              className="text-lg text-cream/60 max-w-2xl mx-auto leading-relaxed"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              AI-powered quantity estimating. Upload your blueprints and get a full CSI-coded estimate with 851+ line items — in minutes, not days.
            </p>
          </motion.div>

          {/* Hero screenshot — Drawing Sheets grid */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, ease: easeOutCubic }}
            className="relative group mb-16"
          >
            <div className="absolute -inset-4 rounded-2xl bg-ember/5 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="relative rounded-xl overflow-hidden border border-cream/10 shadow-2xl shadow-black/40">
              <img
                src={SCREENSHOTS.takeoffDrawingSheets}
                alt="ConstructLine Quantity Takeoff — Drawing Sheets with 23 analyzed construction plans"
                className="w-full h-auto"
              />
            </div>
            <p className="text-center text-cream/30 text-xs mt-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Upload construction drawings — ConstructLine indexes, classifies, and analyzes every sheet automatically
            </p>
          </motion.div>

          {/* Feature grid with real screenshots */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            {/* Line Items with CSI Codes */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.7, ease: easeOutCubic }}
            >
              <div className="rounded-xl overflow-hidden border border-cream/10 shadow-xl shadow-black/30 mb-4">
                <img
                  src={SCREENSHOTS.takeoffLineItems}
                  alt="851 line items across 18 CSI divisions — $1.7M estimated"
                  className="w-full h-auto"
                />
              </div>
              <div className="flex items-start gap-3">
                <DollarSign className="w-5 h-5 text-ember mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-cream mb-1" style={{ fontFamily: "'Sora', sans-serif" }}>
                    851 Line Items, 18 CSI Divisions
                  </h4>
                  <p className="text-xs text-cream/50 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Every item coded to CSI MasterFormat with quantities, units, unit costs, extended costs, and AI confidence scores. Review and verify each one.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Bid Calculator */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.7, delay: 0.1, ease: easeOutCubic }}
            >
              <div className="rounded-xl overflow-hidden border border-cream/10 shadow-xl shadow-black/30 mb-4">
                <img
                  src={SCREENSHOTS.takeoffBidCalculator}
                  alt="Bid Markup Calculator — Labor, Overhead, Profit, Bonds, Contingency"
                  className="w-full h-auto"
                />
              </div>
              <div className="flex items-start gap-3">
                <Target className="w-5 h-5 text-ember mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-cream mb-1" style={{ fontFamily: "'Sora', sans-serif" }}>
                    Bid Markup Calculator
                  </h4>
                  <p className="text-xs text-cream/50 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Add Labor, Overhead, Profit, Bonds, and Contingency percentages on top of your material takeoff total. Build your full bid number in one click.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Item Detail with Drawing Reference */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.7, ease: easeOutCubic }}
            >
              <div className="rounded-xl overflow-hidden border border-cream/10 shadow-xl shadow-black/30 mb-4">
                <img
                  src={SCREENSHOTS.takeoffItemDetail}
                  alt="Line item detail — drawing reference, notes, quantity, unit cost, confidence"
                  className="w-full h-auto"
                />
              </div>
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-ember mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-cream mb-1" style={{ fontFamily: "'Sora', sans-serif" }}>
                    Full Item Detail & Drawing Reference
                  </h4>
                  <p className="text-xs text-cream/50 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Click any line item to see the source drawing, your notes, QTY, unit, cost, and confidence score. Mark items as reviewed or edit inline.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* On-Plan Measurements */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.7, delay: 0.1, ease: easeOutCubic }}
            >
              <div className="rounded-xl overflow-hidden border border-cream/10 shadow-xl shadow-black/30 mb-4">
                <img
                  src={SCREENSHOTS.takeoffMeasurements}
                  alt="On-plan measurement tool — draw lines, areas, and counts directly on blueprints"
                  className="w-full h-auto"
                />
              </div>
              <div className="flex items-start gap-3">
                <Ruler className="w-5 h-5 text-ember mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-cream mb-1" style={{ fontFamily: "'Sora', sans-serif" }}>
                    On-Plan Measurements
                  </h4>
                  <p className="text-xs text-cream/50 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Draw lines, rectangles, and counts directly on the blueprint. Scaled measurements with color-coded layers. Export to CSV or apply to line items.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Item with Saved Measurements */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.7, ease: easeOutCubic }}
            >
              <div className="rounded-xl overflow-hidden border border-cream/10 shadow-xl shadow-black/30 mb-4">
                <img
                  src={SCREENSHOTS.takeoffItemMeasurements}
                  alt="Line item with saved measurements — 39.8 LF measured, 19 counted"
                  className="w-full h-auto"
                />
              </div>
              <div className="flex items-start gap-3">
                <Link2 className="w-5 h-5 text-ember mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-cream mb-1" style={{ fontFamily: "'Sora', sans-serif" }}>
                    Measurements Linked to Line Items
                  </h4>
                  <p className="text-xs text-cream/50 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Your on-plan measurements save directly to each line item. Apply measured quantities or use AI-suggested values. Full audit trail.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* AI Consolidate & Enhance */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.7, delay: 0.1, ease: easeOutCubic }}
            >
              <div className="rounded-xl overflow-hidden border border-cream/10 shadow-xl shadow-black/30 mb-4">
                <img
                  src={SCREENSHOTS.takeoffConsolidateWorking}
                  alt="AI Consolidate & Enhance — merging and refining results across all 23 sheets"
                  className="w-full h-auto"
                />
              </div>
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-ember mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-cream mb-1" style={{ fontFamily: "'Sora', sans-serif" }}>
                    AI Consolidate & Enhance
                  </h4>
                  <p className="text-xs text-cream/50 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    After initial extraction, ConstructLine's AI merges duplicate items, refines quantities, and recalculates costs across all sheets. One click to enhance your entire estimate.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Takeoff Feature bullets */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: easeOutCubic }}
            className="max-w-2xl mx-auto"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                "AI-powered plan analysis",
                "20+ CSI divisions detected",
                "On-plan measurement tools",
                "Bid markup calculator",
                "Regional cost adjustments",
                "Excel & CSV export",
                "Multi-page PDF support",
                "Consolidate & Enhance AI",
              ].map((feat, j) => (
                <div key={j} className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-ember shrink-0" />
                  <span className="text-sm text-cream/60" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {feat}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          TOOL 3: COST LIBRARY
      ═══════════════════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, ease: easeOutCubic }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center lg:grid-flow-dense"
          >
            {/* Text */}
            <div className="lg:col-start-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-ember/10 flex items-center justify-center">
                  <Database className="w-5 h-5 text-ember" />
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
                Cost Library
              </h2>
              <p
                className="text-lg text-cream/60 mb-6 font-medium"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Your pricing database. Always current.
              </p>
              <p
                className="text-cream/50 text-sm leading-relaxed mb-8"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Build and maintain a centralized cost library with your real-world pricing data. Reference it during takeoffs and estimates to produce accurate bids faster.
              </p>
              <ul className="space-y-3">
                {[
                  "Organize costs by CSI division or custom categories",
                  "Unit cost tracking with material + labor breakdown",
                  "Import/export for team-wide consistency",
                  "Integrates with Quantity Takeoff for instant estimates",
                ].map((feat, j) => (
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

            {/* Placeholder */}
            <div className="lg:col-start-1">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.8, delay: 0.2, ease: easeOutCubic }}
                className="relative rounded-xl overflow-hidden border border-cream/10 bg-midnight-card p-12 flex flex-col items-center justify-center min-h-[400px]"
              >
                <Database className="w-20 h-20 text-ember/20 mb-6" />
                <p className="text-cream/50 text-lg font-semibold mb-2" style={{ fontFamily: "'Sora', sans-serif" }}>
                  Cost Library
                </p>
                <p className="text-cream/30 text-sm text-center max-w-xs" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Centralized pricing database for your construction business.
                </p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

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
