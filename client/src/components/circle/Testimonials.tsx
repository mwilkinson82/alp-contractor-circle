import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Quote, Play, Star } from "lucide-react";

const textTestimonials = [
  {
    quote: "Marshall is the real deal. He knows contracting inside and out and can spot the problem fast. He didn't just talk theory — he gave me real fixes that I could implement immediately. Best part is he keeps you moving. No fluff. No wasting time.",
    name: "ALP Coaching Member",
    result: "Implemented fixes within 48 hours",
    stars: 5,
  },
  {
    quote: "Before working with Marshall I felt completely overwhelmed. My business was growing but I was constantly putting out fires. Marshall helped me see what was actually happening underneath everything. The clarity and confidence I got was worth more than any course I've ever purchased.",
    name: "ALP Training Member",
    result: "Went from reactive to strategic",
    stars: 5,
  },
  {
    quote: "This was hands down the best experience I've ever had. He gets into nuance. He asked questions nobody else would ask and identified blind spots I didn't even know existed. It felt like having a world-class expert rewrite my operating system.",
    name: "ALP Member",
    result: "Identified critical blind spots",
    stars: 5,
  },
];

const easeOutCubic = [0.22, 1, 0.36, 1] as [number, number, number, number];

function TestimonialCard({ t, index }: { t: typeof textTestimonials[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50, rotateY: -5 }}
      animate={isInView ? { opacity: 1, y: 0, rotateY: 0 } : {}}
      transition={{ duration: 0.8, ease: easeOutCubic, delay: index * 0.15 }}
      className="group relative"
      style={{ perspective: "1000px" }}
    >
      {/* Card */}
      <div className="relative rounded-2xl p-6 sm:p-8 border border-cream/[0.06] bg-gradient-to-br from-cream/[0.04] to-transparent backdrop-blur-sm overflow-hidden transition-all duration-500 hover:border-ember/20 hover:shadow-[0_0_40px_oklch(0.72_0.12_55/0.08)]">
        {/* Hover glow */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
          style={{ background: "radial-gradient(circle at 50% 0%, oklch(0.72 0.12 55 / 0.06), transparent 70%)" }}
        />

        {/* Stars — all 5 filled */}
        <div className="flex gap-1 mb-4">
          {[...Array(t.stars)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.3, delay: index * 0.15 + 0.3 + i * 0.05 }}
            >
              <Star size={14} className="text-ember fill-ember" />
            </motion.div>
          ))}
        </div>

        {/* Quote Icon */}
        <div className="absolute top-6 right-6 opacity-[0.06] group-hover:opacity-[0.12] transition-opacity duration-500">
          <Quote size={48} className="text-ember" />
        </div>

        {/* Quote Text */}
        <p className="text-sm sm:text-base text-cream/80 leading-[1.8] mb-6 relative z-10" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          "{t.quote}"
        </p>

        {/* Bottom section */}
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-ember/30 to-ember/10 flex items-center justify-center border border-ember/20">
              <span className="text-sm font-bold text-ember" style={{ fontFamily: "'Sora', sans-serif" }}>
                {t.name.charAt(0)}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-cream/70" style={{ fontFamily: "'Sora', sans-serif" }}>
                {t.name}
              </p>
              <p className="text-xs text-ember/70">{t.result}</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function Testimonials() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-80px" });

  return (
    <section ref={sectionRef} className="relative z-10 py-20 sm:py-28 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: easeOutCubic }}
          className="text-center mb-16"
        >
          <motion.p
            initial={{ opacity: 0, letterSpacing: "0.5em" }}
            animate={isInView ? { opacity: 1, letterSpacing: "0.2em" } : {}}
            transition={{ duration: 1, ease: easeOutCubic }}
            className="text-xs font-semibold uppercase text-ember mb-4"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Real Results
          </motion.p>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-cream leading-tight mb-4"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            What Operators Are{" "}
            <span className="text-ember">Saying</span>
          </h2>
          <motion.div
            initial={{ scaleX: 0 }}
            animate={isInView ? { scaleX: 1 } : {}}
            transition={{ duration: 1, delay: 0.3, ease: easeOutCubic }}
            className="w-16 h-[2px] mx-auto mt-4"
            style={{
              background: "linear-gradient(90deg, transparent, oklch(0.72 0.12 55), transparent)",
              transformOrigin: "center",
            }}
          />
        </motion.div>

        {/* Video Testimonial — Featured */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 0.8, ease: easeOutCubic, delay: 0.2 }}
          className="mb-12"
        >
          <div className="relative rounded-2xl overflow-hidden border border-cream/[0.08] bg-midnight-card group">
            {/* Label */}
            <div className="px-6 py-4 flex items-center gap-3 border-b border-cream/[0.06]">
              <Play size={16} className="text-ember" fill="currentColor" />
              <span className="text-sm font-semibold text-cream/80 tracking-wide" style={{ fontFamily: "'Sora', sans-serif" }}>
                Hear From ALP Members
              </span>
            </div>
            {/* YouTube Embed */}
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
              <iframe
                className="absolute inset-0 w-full h-full"
                src="https://www.youtube.com/embed/videoseries?si=Q-WWQSwQOpiM6IS4&list=PLV-2OwQiZMZs8mpkGkHBQ0Qy3xEosMyM3"
                title="ALP Member Testimonials"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </motion.div>

        {/* Text Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {textTestimonials.map((t, i) => (
            <TestimonialCard key={i} t={t} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
