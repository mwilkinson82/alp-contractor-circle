import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { Quote, Play, Star, ChevronLeft, ChevronRight } from "lucide-react";

const textTestimonials = [
  {
    quote: "Marshall's classes are one of a kind. He teaches lessons that would take you YEARS to learn yourself. Within the week I had already seen noticeable changes not only in my business but how I carried myself as a professional.",
    name: "Olive Tree Builds",
    company: "ALP Member",
    stars: 5,
  },
  {
    quote: "I followed Marshall for about a year, and have been involved in other groups. There is NOTHING like Marshall. This is real world stuff here. My 2nd month as a Contractor and I'm at a quarter million in revenue and have a real scalable business. It's unreal. ALP all day, everyday.",
    name: "Sage Construction",
    company: "ALP Member",
    stars: 5,
  },
  {
    quote: "ALP is Super Impactful! I have tried many other coaching programs and Coaches, and none compare to what I've learned in the past 2 months. So if you are really serious about winning in Business and life. Join ALP! It will change your life.",
    name: "Davis Contracting",
    company: "ALP Member",
    stars: 5,
  },
];

const videoTestimonials = [
  {
    label: "Beau Monde — ALP Member",
    src: "https://altitudelogicpressure.com/videos/beau-monde-testimonial.mp4",
    type: "mp4",
    poster: "https://d2xsxph8kpxj0f.cloudfront.net/310519663332724241/JYLdJEaFQZebZwtiasWNpQ/beau-monde-logo.jpeg",
  },
  {
    label: "Ahron Gluck — ALP Member",
    src: "https://altitudelogicpressure.com/videos/ahron-gluck-testimonial.mp4",
    type: "mp4",
    poster: "https://static.readdy.ai/image/000f6613bbd5bf7f02c140851804a982/1da6446268b37a0a97bf892d70ebae14.jfif",
  },
  {
    label: "ALP Member Results",
    src: "https://www.youtube.com/embed/j2ztf9b9YbA?si=-LLfcva946RR3mqG",
    type: "youtube",
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
      transition={{ duration: 0.8, ease: easeOutCubic, delay: index * 0.12 }}
      className="group relative"
      style={{ perspective: "1000px" }}
    >
      <div className="relative rounded-2xl p-6 sm:p-8 border border-cream/[0.06] bg-gradient-to-br from-cream/[0.04] to-transparent backdrop-blur-sm overflow-hidden transition-all duration-500 hover:border-ember/20 hover:shadow-[0_0_40px_oklch(0.72_0.12_55/0.08)] h-full">
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
          style={{ background: "radial-gradient(circle at 50% 0%, oklch(0.72 0.12 55 / 0.06), transparent 70%)" }}
        />
        <div className="flex gap-1 mb-4">
          {[...Array(t.stars)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.3, delay: index * 0.12 + 0.3 + i * 0.05 }}
            >
              <Star size={14} className="text-ember fill-ember" />
            </motion.div>
          ))}
        </div>
        <div className="absolute top-6 right-6 opacity-[0.06] group-hover:opacity-[0.12] transition-opacity duration-500">
          <Quote size={48} className="text-ember" />
        </div>
        <p className="text-sm sm:text-base text-cream/80 leading-[1.8] mb-6 relative z-10" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          "{t.quote}"
        </p>
        <div className="flex items-center gap-3 relative z-10 mt-auto">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-ember/30 to-ember/10 flex items-center justify-center border border-ember/20 shrink-0">
            <span className="text-sm font-bold text-ember" style={{ fontFamily: "'Sora', sans-serif" }}>
              {t.name.charAt(0)}
            </span>
          </div>
          <div>
            <p className="text-sm font-semibold text-cream/80" style={{ fontFamily: "'Sora', sans-serif" }}>
              {t.name}
            </p>
            <p className="text-xs text-ember/70">{t.company}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function VideoCarousel() {
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  const current = videoTestimonials[active];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.8, ease: easeOutCubic, delay: 0.2 }}
      className="mb-16"
    >
      <div className="relative rounded-2xl overflow-hidden border border-cream/[0.08] bg-midnight-card">
        {/* Label bar */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-cream/[0.06]">
          <div className="flex items-center gap-3">
            <Play size={16} className="text-ember" fill="currentColor" />
            <span className="text-sm font-semibold text-cream/80 tracking-wide" style={{ fontFamily: "'Sora', sans-serif" }}>
              {current.label}
            </span>
          </div>
          {/* Carousel controls */}
          <div className="flex items-center gap-2">
            {videoTestimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${i === active ? "bg-ember w-5" : "bg-cream/20 hover:bg-cream/40"}`}
              />
            ))}
            <button
              onClick={() => setActive((active - 1 + videoTestimonials.length) % videoTestimonials.length)}
              className="ml-2 p-1 rounded-full border border-cream/10 hover:border-ember/40 text-cream/50 hover:text-ember transition-all"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setActive((active + 1) % videoTestimonials.length)}
              className="p-1 rounded-full border border-cream/10 hover:border-ember/40 text-cream/50 hover:text-ember transition-all"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Video */}
        <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
          {current.type === "youtube" ? (
            <iframe
              key={current.src}
              className="absolute inset-0 w-full h-full"
              src={current.src}
              title={current.label}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video
              key={current.src}
              className="absolute inset-0 w-full h-full object-cover"
              src={current.src}
              controls
              playsInline
              preload="metadata"
              poster={(current as any).poster}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function Testimonials() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-80px" });

  return (
    <section ref={sectionRef} className="relative z-10 py-14 sm:py-20 lg:py-28 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: easeOutCubic }}
          className="text-center mb-10 sm:mb-16"
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

        {/* Video Testimonials Carousel */}
        <VideoCarousel />

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
