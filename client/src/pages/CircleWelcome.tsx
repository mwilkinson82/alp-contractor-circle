/**
 * The Contractor Circle — Welcome / Post-Purchase Success Page
 * 
 * This is the first thing a new member sees after paying $497/mo.
 * It needs to make them feel like they just made the best decision of their career.
 * Cinematic animations, celebration effects, and clear next steps.
 * 
 * If session_id is in the URL, we verify the checkout and show personalized info.
 * If not (direct visit), we still show the welcome page (graceful degradation).
 */

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { trpc } from "@/lib/trpc";

// ─── Confetti Particle System ───────────────────────────────────────────────
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
        y: window.innerHeight * 0.3 + (Math.random() - 0.5) * 100,
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

    // Initial burst
    setTimeout(() => createBurst(80), 300);
    setTimeout(() => createBurst(60), 800);
    setTimeout(() => createBurst(40), 1500);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particlesRef.current = particlesRef.current.filter(p => p.opacity > 0.01);
      
      particlesRef.current.forEach(p => {
        p.x += p.velocity.x;
        p.y += p.velocity.y;
        p.rotation += p.velocity.rotation;
        p.velocity.y += 0.15; // gravity
        p.velocity.x *= 0.99; // air resistance
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

// ─── Animated Check Mark ────────────────────────────────────────────────────
function AnimatedCheckmark() {
  return (
    <motion.div
      className="relative w-28 h-28 mx-auto mb-8"
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ delay: 0.5, duration: 0.8, type: "spring", bounce: 0.4 }}
    >
      {/* Outer glow ring */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: "radial-gradient(circle, oklch(0.72 0.12 55 / 0.4), transparent 70%)",
        }}
        animate={{
          scale: [1, 1.4, 1],
          opacity: [0.6, 0.2, 0.6],
        }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Circle border */}
      <div className="absolute inset-2 rounded-full border-3 border-ember flex items-center justify-center bg-ember/10">
        {/* Checkmark SVG */}
        <motion.svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay: 1, duration: 0.6 }}
        >
          <motion.path
            d="M5 13l4 4L19 7"
            stroke="oklch(0.72 0.12 55)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 1, duration: 0.6, ease: "easeOut" }}
          />
        </motion.svg>
      </div>
    </motion.div>
  );
}

// ─── Glowing Orb Background ────────────────────────────────────────────────
function CelebrationBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {/* Central warm glow */}
      <motion.div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full"
        style={{
          background: "radial-gradient(circle, oklch(0.72 0.12 55 / 0.12), transparent 70%)",
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Secondary glow */}
      <motion.div
        className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] rounded-full"
        style={{
          background: "radial-gradient(circle, oklch(0.65 0.15 250 / 0.08), transparent 70%)",
        }}
        animate={{
          scale: [1, 1.3, 1],
          x: [0, 30, 0],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Top accent */}
      <motion.div
        className="absolute top-0 right-1/4 w-[300px] h-[300px] rounded-full"
        style={{
          background: "radial-gradient(circle, oklch(0.72 0.12 55 / 0.06), transparent 70%)",
        }}
        animate={{
          y: [0, 20, 0],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

// ─── Step Card ──────────────────────────────────────────────────────────────
function StepCard({
  step,
  icon,
  title,
  description,
  cta,
  ctaLink,
  delay,
}: {
  step: number;
  icon: string;
  title: string;
  description: string;
  cta?: string;
  ctaLink?: string;
  delay: number;
}) {
  return (
    <motion.div
      className="glass-card rounded-2xl p-6 relative overflow-hidden group"
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ scale: 1.02, y: -2 }}
    >
      {/* Step number accent */}
      <div className="absolute top-4 right-4 text-5xl font-heading font-bold text-ember/10">
        {step}
      </div>
      
      {/* Hover glow */}
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: "linear-gradient(135deg, oklch(0.72 0.12 55 / 0.05), transparent 60%)",
        }}
      />

      <div className="relative z-10">
        <div className="flex items-center gap-4 mb-3">
          <div className="w-12 h-12 rounded-xl bg-ember/15 flex items-center justify-center text-2xl">
            {icon}
          </div>
          <div>
            <p className="text-xs font-heading uppercase tracking-widest text-ember mb-0.5">
              Step {step}
            </p>
            <h3 className="text-lg font-heading font-semibold text-cream">{title}</h3>
          </div>
        </div>
        <p className="text-cream-muted text-sm leading-relaxed mb-4 pl-16">
          {description}
        </p>
        {cta && ctaLink && (
          <div className="pl-16">
            <a
              href={ctaLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ember/15 border border-ember/30 text-ember font-heading font-medium text-sm hover:bg-ember/25 hover:border-ember/50 transition-all duration-300"
            >
              {cta}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 17L17 7M17 7H7M17 7V17" />
              </svg>
            </a>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main Welcome Page ──────────────────────────────────────────────────────
export default function CircleWelcome() {
  const [showContent, setShowContent] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  // Extract session_id from URL params
  const sessionId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("session_id");
  }, []);

  // Verify checkout session if session_id is present
  const { data: checkoutData } = trpc.stripe.verifyCheckout.useQuery(
    { sessionId: sessionId! },
    { enabled: !!sessionId, retry: false }
  );

  useEffect(() => {
    // Stagger the content reveal
    const timer1 = setTimeout(() => setShowContent(true), 600);
    const timer2 = setTimeout(() => setShowSteps(true), 1800);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  // Determine the display name
  const memberName = checkoutData?.customerName || null;

  return (
    <div className="min-h-screen bg-navy-deep relative overflow-hidden">
      <CelebrationBackground />
      <ConfettiCanvas />

      {/* Gradient bar at top */}
      <div className="gradient-bar h-1 w-full fixed top-0 z-50" />

      <div className="relative z-10 max-w-lg mx-auto px-5 py-16 min-h-screen flex flex-col">
        {/* ─── Hero Celebration ─────────────────────────────────────── */}
        <div className="flex-1 flex flex-col items-center justify-center text-center pt-8">
          <AnimatedCheckmark />

          <AnimatePresence>
            {showContent && (
              <>
                {/* Welcome badge */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-ember/15 border border-ember/30 mb-6"
                >
                  <span className="w-2 h-2 rounded-full bg-ember animate-pulse" />
                  <span className="text-xs font-heading uppercase tracking-widest text-ember font-medium">
                    Founding Member
                  </span>
                </motion.div>

                {/* Personalized greeting if we have the name */}
                {memberName && (
                  <motion.p
                    className="text-ember/80 font-heading text-sm tracking-wide mb-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                  >
                    {memberName}, you're in.
                  </motion.p>
                )}

                {/* Main headline — word by word cascade */}
                <motion.div className="mb-4">
                  {["Welcome", "to"].map((word, i) => (
                    <motion.span
                      key={word}
                      className="inline-block font-heading font-bold text-cream mr-3"
                      style={{ fontSize: "clamp(2rem, 8vw, 3.5rem)" }}
                      initial={{ opacity: 0, y: 30, rotateX: 40 }}
                      animate={{ opacity: 1, y: 0, rotateX: 0 }}
                      transition={{
                        delay: 0.8 + i * 0.15,
                        duration: 0.6,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    >
                      {word}
                    </motion.span>
                  ))}
                  <br />
                  {["The", "Circle."].map((word, i) => (
                    <motion.span
                      key={word}
                      className={`inline-block font-heading font-bold ${
                        word === "Circle." ? "text-ember" : "text-cream"
                      } ${word !== "Circle." ? "mr-3" : ""}`}
                      style={{ fontSize: "clamp(2rem, 8vw, 3.5rem)" }}
                      initial={{ opacity: 0, y: 30, rotateX: 40 }}
                      animate={{ opacity: 1, y: 0, rotateX: 0 }}
                      transition={{
                        delay: 1.1 + i * 0.15,
                        duration: 0.6,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    >
                      {word}
                    </motion.span>
                  ))}
                </motion.div>

                {/* Subtitle */}
                <motion.p
                  className="text-cream-muted text-base leading-relaxed max-w-sm mb-2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.6, duration: 0.6 }}
                >
                  You just made a decision that will change the trajectory of your business.
                </motion.p>

                <motion.p
                  className="text-cream/60 text-sm leading-relaxed max-w-sm mb-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.9, duration: 0.6 }}
                >
                  The contractors who win aren't the ones who wait. They're the ones who invest in themselves and execute. That's you.
                </motion.p>

                {/* Divider line */}
                <motion.div
                  className="w-16 h-0.5 bg-gradient-to-r from-transparent via-ember to-transparent mb-8"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 2.2, duration: 0.8 }}
                />
              </>
            )}
          </AnimatePresence>
        </div>

        {/* ─── Next Steps ──────────────────────────────────────────── */}
        <AnimatePresence>
          {showSteps && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4 pb-12"
            >
              <motion.h2
                className="text-center font-heading text-lg text-cream/80 mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2.4, duration: 0.5 }}
              >
                Here's what happens next:
              </motion.h2>

              <StepCard
                step={1}
                icon="📧"
                title="Check Your Email"
                description="A welcome email is on its way with everything you need to get started — your login details, call schedule, and member resources."
                delay={2.6}
              />

              <StepCard
                step={2}
                icon="💬"
                title="Join the Community"
                description="Get instant access to our private Discord community. Introduce yourself, connect with other serious contractors, and start building relationships."
                cta="Join Discord"
                ctaLink="https://discord.gg/jnwDPTY6D3"
                delay={2.9}
              />

              <StepCard
                step={3}
                icon="📅"
                title="Mark Your Calendar"
                description="Your first bi-weekly call is coming up on Thursday evening. Come with questions, deals you're working, or challenges you're facing. Marshall and the community are here to help you win."
                delay={3.2}
              />

              <StepCard
                step={4}
                icon="🚀"
                title="Start Executing"
                description="Browse the template library, review past call recordings, and start implementing. The contractors in this room don't just learn — they execute."
                delay={3.5}
              />

              {/* Final motivational message */}
              <motion.div
                className="text-center pt-8 pb-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 4, duration: 0.8 }}
              >
                <p className="text-cream/50 text-sm italic mb-6">
                  "The future is bright. The value is real. Welcome to a world where anything is possible."
                </p>
                <p className="text-ember font-heading font-semibold text-sm tracking-wide">
                  — Marshall Wilkinson
                </p>
              </motion.div>

              {/* Back to Circle link */}
              <motion.div
                className="text-center pt-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 4.5, duration: 0.5 }}
              >
                <a
                  href="/circle"
                  className="text-cream/40 text-xs hover:text-cream/60 transition-colors"
                >
                  ← Back to The Contractor Circle
                </a>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <motion.footer
          className="text-center py-6 border-t border-white/5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 5, duration: 0.5 }}
        >
          <p className="text-cream/30 text-xs">
            © 2026 Altitude Logic Pressure. All rights reserved.
          </p>
        </motion.footer>
      </div>
    </div>
  );
}
