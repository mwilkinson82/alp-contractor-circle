/**
 * Submit a Question CTA — Landing page section that teases the portal's
 * question submission feature. Clicking takes non-members to /portal (login gate).
 */
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { MessageSquare, ArrowRight, Send, Paperclip, CheckCircle2 } from "lucide-react";
import { useLocation } from "wouter";

const easeOutCubic = [0.22, 1, 0.36, 1] as [number, number, number, number];

export function SubmitQuestionCTA() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const [, navigate] = useLocation();

  return (
    <section ref={ref} className="relative z-10 py-14 sm:py-20 px-4 sm:px-6 overflow-hidden">
      {/* Subtle background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 50% 50%, oklch(0.55 0.15 250 / 0.06), transparent 60%)",
        }}
      />

      <div className="max-w-5xl mx-auto relative">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Left — Copy */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, ease: easeOutCubic }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-ember/10 border border-ember/20 mb-6">
              <MessageSquare className="w-4 h-4 text-ember" />
              <span className="text-xs font-bold text-ember uppercase tracking-wider">Member Feature</span>
            </div>

            <h2
              className="text-2xl sm:text-3xl md:text-4xl font-bold text-cream leading-tight mb-4"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Submit Your Question{" "}
              <span className="text-ember">Before the Call</span>
            </h2>

            <p
              className="text-cream/50 text-base sm:text-lg leading-relaxed mb-6"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Members submit their real deals, proposals, and challenges directly through the portal.
              Marshall reviews them live on the next call — with full context and attachments.
            </p>

            <ul className="space-y-3 mb-8">
              {[
                "Describe your situation in detail",
                "Attach proposals, bids, or photos",
                "Get Marshall's live feedback on the call",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-ember shrink-0 mt-0.5" />
                  <span className="text-cream/70 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {item}
                  </span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => navigate("/portal")}
              className="group inline-flex items-center gap-3 px-6 py-3.5 bg-ember hover:bg-ember-light text-midnight font-bold text-sm rounded-xl transition-all duration-300 hover:scale-[1.03] shadow-lg shadow-ember/20 cursor-pointer"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              <Send className="w-4 h-4" />
              Submit a Question
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>

          {/* Right — Visual mock of the question form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, ease: easeOutCubic, delay: 0.15 }}
            className="relative"
          >
            {/* Glow behind card */}
            <div
              className="absolute inset-0 rounded-2xl blur-3xl opacity-20 pointer-events-none"
              style={{ background: "oklch(0.72 0.12 55 / 0.3)" }}
            />

            {/* Mock form card */}
            <div className="relative rounded-2xl border border-cream/[0.08] bg-gradient-to-br from-cream/[0.04] to-transparent backdrop-blur-sm p-6 sm:p-8">
              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-ember/20 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-ember" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-cream" style={{ fontFamily: "'Sora', sans-serif" }}>
                    Submit a Question
                  </p>
                  <p className="text-xs text-cream/40">For the next live call</p>
                </div>
              </div>

              {/* Mock form fields */}
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-cream/40 mb-1.5 font-medium">Topic</div>
                  <div className="h-10 rounded-lg bg-white/5 border border-cream/[0.08] flex items-center px-3">
                    <span className="text-sm text-cream/30">e.g. Pricing a $2M commercial bid</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-cream/40 mb-1.5 font-medium">Your Question</div>
                  <div className="h-24 rounded-lg bg-white/5 border border-cream/[0.08] p-3">
                    <span className="text-sm text-cream/30">Describe your situation...</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-cream/[0.08] text-cream/40 text-xs">
                    <Paperclip className="w-3.5 h-3.5" />
                    Attach Files
                  </div>
                  <span className="text-xs text-cream/25">PDF, images, docs up to 10MB</span>
                </div>
              </div>

              {/* Mock submit button */}
              <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-ember/20 border border-ember/30">
                  <Send className="w-4 h-4 text-ember" />
                  <span className="text-sm font-semibold text-ember">Submit Question</span>
                </div>
                <span className="text-xs text-cream/25">Members only</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
