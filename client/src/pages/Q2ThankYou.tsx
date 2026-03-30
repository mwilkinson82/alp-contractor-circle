/**
 * Q2 Framework — Thank You / Download Page
 * 
 * Shown after email capture. Confetti celebration + direct download link.
 * Route: /q2/thank-you
 */

import { motion } from "framer-motion";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";

const PDF_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663332724241/JYLdJEaFQZebZwtiasWNpQ/Q1_Q2_Framework_ALP_Contractor_Circle_cead240b.pdf";

// ─── Confetti ─────────────────────────────────────────────────────────────
interface Particle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  color: string;
  velocity: { x: number; y: number; rotation: number };
  opacity: number;
  shape: "circle" | "square" | "triangle";
}

const COLORS = [
  "#D4915C", "#C9A96E", "#EDE6DB", "#8B6F47", "#E8C17A",
  "#B87A3D", "#F0D9A0", "#A0845C", "#FFD700", "#FFA500",
];

function ConfettiCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);

  const createBurst = useCallback((count: number) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 3 + Math.random() * 8;
      newParticles.push({
        id: Date.now() + i,
        x: window.innerWidth / 2 + (Math.random() - 0.5) * 200,
        y: window.innerHeight * 0.25 + (Math.random() - 0.5) * 100,
        rotation: Math.random() * 360,
        scale: 0.5 + Math.random() * 1.5,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed - 5,
          rotation: (Math.random() - 0.5) * 15,
        },
        opacity: 1,
        shape: (["circle", "square", "triangle"] as const)[Math.floor(Math.random() * 3)],
      });
    }
    particlesRef.current = [...particlesRef.current, ...newParticles];
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    setTimeout(() => createBurst(80), 200);
    setTimeout(() => createBurst(60), 700);
    setTimeout(() => createBurst(40), 1300);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesRef.current = particlesRef.current.filter(p => p.opacity > 0.01);
      particlesRef.current.forEach(p => {
        p.x += p.velocity.x;
        p.y += p.velocity.y;
        p.rotation += p.velocity.rotation;
        p.velocity.y += 0.15;
        p.velocity.x *= 0.99;
        p.opacity -= 0.005;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;

        const size = 6 * p.scale;
        if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === "square") {
          ctx.fillRect(-size / 2, -size / 2, size, size);
        } else {
          ctx.beginPath();
          ctx.moveTo(0, -size / 2);
          ctx.lineTo(size / 2, size / 2);
          ctx.lineTo(-size / 2, size / 2);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      });
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", handleResize);
    };
  }, [createBurst]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 50 }}
    />
  );
}

// ─── Animated Checkmark ───────────────────────────────────────────────────
function AnimatedCheckmark() {
  return (
    <motion.div
      className="relative w-24 h-24 mx-auto mb-6"
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ delay: 0.3, duration: 0.8, type: "spring", bounce: 0.4 }}
    >
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: "radial-gradient(circle, oklch(0.72 0.12 55 / 0.4), transparent 70%)",
        }}
        animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0.2, 0.6] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute inset-2 rounded-full border-3 border-ember flex items-center justify-center bg-ember/10">
        <motion.svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          <motion.path
            d="M5 13l4 4L19 7"
            stroke="oklch(0.72 0.12 55)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.8, duration: 0.6, ease: "easeOut" }}
          />
        </motion.svg>
      </div>
    </motion.div>
  );
}

// ─── Background ───────────────────────────────────────────────────────────
function CelebrationBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      <motion.div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full"
        style={{
          background: "radial-gradient(circle, oklch(0.72 0.12 55 / 0.1), transparent 70%)",
        }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-1/3 left-1/3 w-[350px] h-[350px] rounded-full"
        style={{
          background: "radial-gradient(circle, oklch(0.65 0.15 250 / 0.06), transparent 70%)",
        }}
        animate={{ scale: [1, 1.3, 1], x: [0, 20, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

// ─── Main Thank You Page ──────────────────────────────────────────────────
export default function Q2ThankYou() {
  const [showContent, setShowContent] = useState(false);
  const [showCta, setShowCta] = useState(false);

  const firstName = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("name") || "";
  }, []);

  useEffect(() => {
    const t1 = setTimeout(() => setShowContent(true), 500);
    const t2 = setTimeout(() => setShowCta(true), 1500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div className="min-h-screen bg-navy-deep relative overflow-hidden">
      <CelebrationBackground />
      <ConfettiCanvas />

      {/* Gradient bar */}
      <div
        className="h-1 w-full fixed top-0 z-50"
        style={{
          background: "linear-gradient(90deg, oklch(0.55 0.12 55), oklch(0.72 0.12 55), oklch(0.82 0.10 55))",
        }}
      />

      <div className="relative z-10 max-w-lg mx-auto px-5 py-16 min-h-screen flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center text-center pt-8">
          <AnimatedCheckmark />

          {showContent && (
            <>
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-ember/15 border border-ember/30 mb-6"
              >
                <span className="w-2 h-2 rounded-full bg-ember animate-pulse" />
                <span className="text-xs font-heading uppercase tracking-widest text-ember font-medium">
                  Framework Ready
                </span>
              </motion.div>

              {/* Personalized greeting */}
              {firstName && (
                <motion.p
                  className="text-ember/80 font-heading text-sm tracking-wide mb-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                >
                  {firstName}, you're all set.
                </motion.p>
              )}

              {/* Main headline */}
              <motion.h1
                className="font-heading font-bold text-cream mb-4"
                style={{ fontSize: "clamp(1.75rem, 7vw, 2.75rem)" }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
              >
                Your Q2 Framework{" "}
                <span className="text-ember">Is Ready.</span>
              </motion.h1>

              {/* Subtitle */}
              <motion.p
                className="text-cream-muted text-base leading-relaxed mb-8 max-w-md"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55, duration: 0.5 }}
              >
                Click below to download your copy. We've also sent a link to your email.
              </motion.p>
            </>
          )}

          {/* Download CTA */}
          {showCta && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-sm"
            >
              {/* Download card */}
              <div
                className="rounded-2xl p-6 mb-6 relative overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, oklch(0.16 0.02 260), oklch(0.13 0.02 260))",
                  border: "1px solid oklch(0.72 0.12 55 / 0.15)",
                  boxShadow: "0 0 60px oklch(0.72 0.12 55 / 0.06)",
                }}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-ember/15 flex items-center justify-center shrink-0">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="oklch(0.72 0.12 55)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-heading font-semibold text-cream text-sm">
                      Q1→Q2 Framework
                    </p>
                    <p className="text-cream-muted text-xs">
                      PDF &middot; 6 Pages &middot; ALP Contractor Circle
                    </p>
                  </div>
                </div>

                <a
                  href={PDF_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full py-3 rounded-xl font-heading font-semibold text-sm tracking-wide text-center transition-all duration-300"
                  style={{
                    background: "linear-gradient(135deg, oklch(0.72 0.12 55), oklch(0.62 0.12 55))",
                    color: "oklch(0.10 0.01 270)",
                    boxShadow: "0 4px 20px oklch(0.72 0.12 55 / 0.3)",
                  }}
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download the Framework
                  </span>
                </a>
              </div>

              {/* What's next section */}
              <motion.div
                className="rounded-2xl p-6"
                style={{
                  background: "oklch(0.14 0.02 260)",
                  border: "1px solid oklch(0.72 0.12 55 / 0.08)",
                }}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <p className="text-xs font-heading uppercase tracking-widest text-ember/70 mb-4">
                  What's Next
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-ember/15 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-ember text-xs font-bold">1</span>
                    </div>
                    <p className="text-cream-muted text-sm leading-relaxed">
                      <span className="text-cream font-medium">Read the framework.</span> It's 6 pages. Takes 10 minutes.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-ember/15 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-ember text-xs font-bold">2</span>
                    </div>
                    <p className="text-cream-muted text-sm leading-relaxed">
                      <span className="text-cream font-medium">Fill out the Q2 Commitment page.</span> Name what you're killing, doubling, and fixing.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-ember/15 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-ember text-xs font-bold">3</span>
                    </div>
                    <p className="text-cream-muted text-sm leading-relaxed">
                      <span className="text-cream font-medium">Execute this week.</span> Q2 starts Wednesday. Don't wait.
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* CTA to Contractor Circle */}
              <motion.div
                className="mt-8 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
              >
                <p className="text-cream-muted text-xs mb-3">
                  Want more frameworks, live coaching, and a community of operators?
                </p>
                <a
                  href="/"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ember/10 border border-ember/25 text-ember font-heading font-medium text-sm hover:bg-ember/20 hover:border-ember/40 transition-all duration-300"
                >
                  Explore The Contractor Circle
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </a>
              </motion.div>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center pt-8 pb-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="font-heading font-bold text-cream/60 text-xs tracking-wider">ALP</span>
            <span className="text-ember/30">|</span>
            <span className="text-cream-muted/40 text-xs">Contractor Circle</span>
          </div>
          <p className="text-cream-muted/30 text-xs">
            &copy; {new Date().getFullYear()} ALP. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
