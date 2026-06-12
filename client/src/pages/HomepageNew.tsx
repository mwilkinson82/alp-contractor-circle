import { useCircleCheckout } from "@/hooks/useCircleCheckout";
import { useRef, useState, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Settings, Video, Calendar, Play, FileText, Wrench, Users, Clock, MessageSquare, DollarSign, Lock, UserCheck, Shield, CheckCircle, Volume2, VolumeX } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const HERO_VIDEO = "/manus-storage/alp-hero-video-v3_002ac64b.mp4";
const HERO_IMAGE = "/manus-storage/hero-chaos-aos-upscaled_3a8577ef.png";
const CONSTRUCTION_BW = "https://d2xsxph8kpxj0f.cloudfront.net/310519663332724241/JYLdJEaFQZebZwtiasWNpQ/construction-site-bw-SrsA4ksAtdzSnTgkD5AyGS.webp";
const PERSON_WINDOW = "https://d2xsxph8kpxj0f.cloudfront.net/310519663332724241/JYLdJEaFQZebZwtiasWNpQ/person-looking-out-4bHeheFvbpTNNeupisfpqF.webp";

export default function HomepageNew() {
  const { startCheckout, isLoading } = useCircleCheckout();
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  // GSAP Scroll Animations — scrub-based card stacking + text reveals
  useEffect(() => {
    if (!mainRef.current) return;

    const ctx = gsap.context(() => {
      // =============================================
      // CARD STACK: Hero Image Section
      // Enters from below (scale up), exits by receding (scale down + fade)
      // =============================================
      const heroSection = mainRef.current!.querySelector("[data-hero-section]");
      const heroCard = mainRef.current!.querySelector("[data-hero-card]");
      if (heroCard && heroSection) {
        // Entrance: scale from 0.88 → 1, y from 60 → 0
        gsap.fromTo(
          heroCard,
          { scale: 0.88, y: 60 },
          {
            scale: 1,
            y: 0,
            ease: "none",
            scrollTrigger: {
              trigger: heroSection,
              start: "top bottom",
              end: "top 40%",
              scrub: true,
            },
          }
        );
        // Exit: scale down slightly, fade as user scrolls well past
        gsap.to(heroCard, {
          scale: 0.94,
          opacity: 0.6,
          y: -30,
          ease: "none",
          scrollTrigger: {
            trigger: heroSection,
            start: "bottom 40%",
            end: "bottom -20%",
            scrub: true,
          },
        });
      }

      // =============================================
      // CARD STACK: Copy Section
      // Enters from below (fade up + scale), exits by receding
      // =============================================
      const copySection = mainRef.current!.querySelector("[data-copy-section]");
      const copyCard = mainRef.current!.querySelector("[data-copy-card]");
      if (copyCard && copySection) {
        // Entrance: fade up quickly so text is fully visible
        gsap.fromTo(
          copyCard,
          { y: 50, opacity: 0, scale: 0.97 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            ease: "none",
            scrollTrigger: {
              trigger: copySection,
              start: "top 90%",
              end: "top 45%",
              scrub: true,
            },
          }
        );
        // Exit: only fade once section is well past center
        gsap.to(copyCard, {
          scale: 0.96,
          opacity: 0.5,
          y: -20,
          ease: "none",
          scrollTrigger: {
            trigger: copySection,
            start: "bottom 30%",
            end: "bottom -20%",
            scrub: true,
          },
        });
      }

      // =============================================
      // CARD STACK: Problem Section
      // Enters from below (scale up + fade in)
      // =============================================
      const problemSection = mainRef.current!.querySelector("[data-problem-section]");
      if (problemSection) {
        gsap.fromTo(
          problemSection,
          { y: 60, opacity: 0, scale: 0.94 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            ease: "none",
            scrollTrigger: {
              trigger: problemSection,
              start: "top 90%",
              end: "top 40%",
              scrub: true,
            },
          }
        );
        // Exit: only after section is well past
        gsap.to(problemSection, {
          scale: 0.96,
          opacity: 0.6,
          y: -20,
          ease: "none",
          scrollTrigger: {
            trigger: problemSection,
            start: "bottom 30%",
            end: "bottom -20%",
            scrub: true,
          },
        });
      }

      // =============================================
      // CARD STACK: All [data-animate] sections — entrance + exit
      // =============================================
      const animSections = mainRef.current!.querySelectorAll("[data-animate]");
      animSections.forEach((section) => {
        // Entrance: complete by the time section reaches 40% from top
        gsap.fromTo(
          section,
          { y: 60, opacity: 0, scale: 0.95 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top 90%",
              end: "top 40%",
              scrub: true,
            },
          }
        );
        // Exit: only after section bottom passes 30% of viewport
        if (!section.classList.contains("no-exit")) {
          gsap.to(section, {
            scale: 0.96,
            opacity: 0.6,
            y: -15,
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "bottom 30%",
              end: "bottom -15%",
              scrub: true,
            },
          });
        }
      });

      // =============================================
      // CAPTION-STYLE TEXT REVEAL
      // Each headline line fades up tied to scroll
      // =============================================
      const captionLines = mainRef.current!.querySelectorAll("[data-caption-line]");
      captionLines.forEach((line, i) => {
        gsap.fromTo(
          line,
          { y: 30, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            ease: "none",
            scrollTrigger: {
              trigger: line,
              start: "top 95%",
              end: "top 70%",
              scrub: true,
            },
          }
        );
      });

      // =============================================
      // Scale-in for comparison panel
      // =============================================
      const panel = mainRef.current!.querySelector("[data-scale-in]");
      if (panel) {
        gsap.fromTo(
          panel,
          { scale: 0.88, opacity: 0, y: 40 },
          {
            scale: 1,
            opacity: 1,
            y: 0,
            ease: "none",
            scrollTrigger: {
              trigger: panel,
              start: "top 90%",
              end: "top 50%",
              scrub: true,
            },
          }
        );
      }

      // =============================================
      // Stagger feature cards
      // =============================================
      const cards = mainRef.current!.querySelectorAll("[data-card]");
      if (cards.length > 0) {
        cards.forEach((card, i) => {
          gsap.fromTo(
            card,
            { y: 50, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              ease: "none",
              scrollTrigger: {
                trigger: card,
                start: "top 92%",
                end: "top 70%",
                scrub: true,
              },
            }
          );
        });
      }
    }, mainRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={mainRef} style={{ backgroundColor: "#F5F1EB" }}>
      {/* Section 0: Video Hero — Full-bleed 100vh autoplay with nav overlay */}
      <section className="w-full relative h-screen overflow-hidden">
        {/* Navigation overlaid on video */}
        <nav className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 md:px-10 py-5 z-20">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tracking-wide" style={{ color: "#c96a00" }}>ALP</span>
            <span className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>|</span>
            <span className="text-sm font-medium tracking-wide text-white">CONTRACTOR CIRCLE</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://app.alpcontractorcircle.com/login"
              className="text-xs tracking-wider font-medium hover:opacity-70 transition-opacity text-white"
            >
              SIGN IN
            </a>
            <button
              onClick={startCheckout}
              disabled={isLoading}
              className="text-xs tracking-wider font-medium px-5 py-2.5 border border-white text-white transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              GET STARTED
            </button>
          </div>
        </nav>

        {/* Full-bleed video filling viewport */}
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover block"
        >
          <source src={HERO_VIDEO} type="video/mp4" />
        </video>

        {/* Unmute button — bottom right, modern pill style */}
        <button
          onClick={toggleMute}
          className="absolute bottom-8 right-8 z-20 flex items-center gap-2 px-4 py-2.5 rounded-full backdrop-blur-md transition-all hover:scale-105"
          style={{ backgroundColor: "rgba(0,0,0,0.55)", border: "1px solid rgba(255,255,255,0.2)" }}
          aria-label={isMuted ? "Unmute video" : "Mute video"}
        >
          {isMuted ? (
            <>
              <VolumeX size={16} className="text-white" />
              <span className="text-xs text-white font-medium tracking-wide">TAP FOR SOUND</span>
            </>
          ) : (
            <>
              <Volume2 size={16} className="text-white" />
              <span className="text-xs text-white font-medium tracking-wide">SOUND ON</span>
            </>
          )}
        </button>
      </section>

      {/* Section 1: Hero Image — card in the stack */}
      <section className="w-full relative z-10" data-hero-section style={{ perspective: "1200px" }}>
        <div className="w-full" data-hero-card style={{ transformOrigin: "center center", willChange: "transform, opacity" }}>
          <img
            src={HERO_IMAGE}
            alt="From to-do lists that run your week — to a system that runs your company"
            className="w-full h-auto block"
          />
        </div>
      </section>

      {/* Section 1b: Hero Copy — card in the stack */}
      <section className="w-full relative z-20" data-copy-section style={{ backgroundColor: "#F5F1EB" }}>
        <div className="px-6 md:px-10 lg:px-14 pt-16 pb-20 md:pt-20 md:pb-28 max-w-4xl mx-auto text-center" data-copy-card style={{ transformOrigin: "center center", willChange: "transform, opacity" }}>
          <p
            className="font-label text-xs tracking-[0.3em] font-medium mb-6"
            style={{ color: "#c96a00" }}
          >
            CONTRACTOR CIRCLE OPERATING SYSTEM
          </p>
          <h1
            className="text-4xl md:text-5xl lg:text-[4.5rem] leading-[1.05] mb-2"
            style={{ color: "#1a1a1a", fontFamily: "'Instrument Serif', Georgia, serif" }}
          >
            <span className="block" data-caption-line>Your competitors have <em className="not-italic" style={{ fontFamily: "'EB Garamond', Georgia, serif", fontStyle: "italic", fontSize: "1.15em" }}>systems.</em></span>
            <span className="block mt-1" data-caption-line>
              You have a{" "}
              <span className="relative inline-block" style={{ fontFamily: "'EB Garamond', Georgia, serif", fontStyle: "italic", fontSize: "1.15em" }}>
                to-do list.
                <svg
                  className="absolute -bottom-2 left-0 w-full"
                  viewBox="0 0 200 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  preserveAspectRatio="none"
                  style={{ height: "10px" }}
                >
                  <path
                    d="M2 8 C40 2, 80 2, 100 6 C120 10, 160 10, 198 4"
                    stroke="#c96a00"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
              </span>
            </span>
          </h1>
          <p className="text-base md:text-lg leading-relaxed mb-10 max-w-2xl mx-auto mt-6" style={{ color: "#4a4a4a" }}>
            The Contractor Circle gives construction owners the operating system, tools, and weekly rhythm to scale without becoming the bottleneck.
          </p>
          <div className="flex items-center justify-center gap-5 flex-wrap">
            <button
              onClick={startCheckout}
              disabled={isLoading}
              className="text-xs tracking-[0.2em] font-medium px-8 py-4 transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ backgroundColor: "#1a1a1a", color: "#F5F1EB" }}
            >
              {isLoading ? "LOADING..." : "JOIN THE CIRCLE"}
            </button>
            <a
              href="#whats-installed"
              className="text-xs tracking-[0.2em] font-medium hover:opacity-70 transition-opacity flex items-center gap-1.5 border-b pb-0.5"
              style={{ color: "#1a1a1a", borderColor: "#1a1a1a" }}
            >
              SEE WHAT'S INSIDE &nbsp;→
            </a>
          </div>
        </div>
      </section>

      {/* Section 2: The Problem */}
      <section className="px-6 md:px-12 py-16 md:py-24 relative z-30" data-problem-section style={{ backgroundColor: "#FFFFFF", transformOrigin: "center center", willChange: "transform, opacity" }}>
        <div className="max-w-5xl mx-auto text-center">
          <h2
            className="text-3xl md:text-4xl lg:text-[2.8rem] leading-[1.15] mb-6"
            style={{ color: "#1a1a1a", fontFamily: "'Instrument Serif', Georgia, serif" }}
          >
            <span className="block" data-caption-line>Most contractors don't have a <em className="not-italic" style={{ fontFamily: "'EB Garamond', Georgia, serif", fontStyle: "italic", fontSize: "1.1em" }}>growth</em> problem.</span>
            <span className="block mt-1" data-caption-line>They have an <em className="not-italic" style={{ fontFamily: "'EB Garamond', Georgia, serif", fontStyle: "italic", fontSize: "1.1em" }}>operating</em> problem.</span>
          </h2>
          <p className="text-base md:text-lg mb-14 max-w-3xl mx-auto" style={{ color: "#555" }}>
            The leads are there. The jobs are there. The ambition is there. But the company is still running through the owner's head.
          </p>

          {/* 6 pain-point cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { icon: <Users size={24} />, text: "Every decision comes back to you." },
              { icon: <Clock size={24} />, text: "Selections are late." },
              { icon: <UserCheck size={24} />, text: "PMs manage differently." },
              { icon: <MessageSquare size={24} />, text: "Meetings create talk, not traction." },
              { icon: <DollarSign size={24} />, text: "Cash, schedule, and risk are reviewed too late." },
              { icon: <Lock size={24} />, text: "The company grows, but the owner gets trapped." },
            ].map((item, i) => (
              <div
                key={i}
                className="flex flex-col items-center text-center p-4 pt-6"
                style={{ border: "1px solid #e5e0d8" }}
                data-card
              >
                <div className="mb-3" style={{ color: "#1a1a1a" }}>{item.icon}</div>
                <p className="text-sm leading-snug" style={{ color: "#333" }}>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3: The Shift */}
      <section className="px-6 md:px-12 py-16 md:py-24 relative z-40" style={{ backgroundColor: "#F5F1EB", transformOrigin: "center center", willChange: "transform, opacity" }} data-animate>
        <div className="max-w-5xl mx-auto">
          <p className="font-label text-xs tracking-[0.3em] font-medium mb-6" style={{ color: "#c96a00" }}>
            THE SHIFT
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Left: headline + body */}
            <div>
              <h2
                className="text-3xl md:text-4xl lg:text-[2.8rem] leading-[1.1] mb-6"
                style={{ color: "#1a1a1a", fontFamily: "'Instrument Serif', Georgia, serif" }}
              >
                <span className="block" data-caption-line>
                  Memory is{" "}
                  <em className="not-italic" style={{ fontFamily: "'EB Garamond', Georgia, serif", fontStyle: "italic", fontSize: "1.1em", textDecoration: "underline", textDecorationColor: "#c96a00", textUnderlineOffset: "4px" }}>not</em>{" "}
                  <em className="not-italic" style={{ fontFamily: "'EB Garamond', Georgia, serif", fontStyle: "italic", fontSize: "1.1em" }}>management.</em>
                </span>
              </h2>
              <p className="text-base md:text-lg leading-relaxed" style={{ color: "#4a4a4a" }}>
                The companies that scale are not smarter because they remember more. They scale because they install rhythm, visibility, accountability, and tools.
              </p>
            </div>

            {/* Right: comparison panel */}
            <div className="rounded-none overflow-hidden" style={{ backgroundColor: "#1a1a1a" }} data-scale-in>
              <div className="grid grid-cols-2">
                {/* Running from Memory */}
                <div className="p-6 md:p-8" style={{ borderRight: "1px solid #333" }}>
                  <p className="text-xs tracking-[0.2em] font-medium mb-5" style={{ color: "#888" }}>
                    RUNNING FROM MEMORY
                  </p>
                  <ul className="space-y-3">
                    {["Reacting", "Firefighting", "Forgetting", "Bottleneck"].map((item) => (
                      <li key={item} className="text-sm flex items-center gap-2" style={{ color: "#ccc" }}>
                        <span style={{ color: "#666" }}>•</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>
                {/* Operating with Systems */}
                <div className="p-6 md:p-8">
                  <p className="text-xs tracking-[0.2em] font-medium mb-5" style={{ color: "#c96a00" }}>
                    OPERATING WITH SYSTEMS
                  </p>
                  <ul className="space-y-3">
                    {["Rhythm", "Visibility", "Accountability", "Scale"].map((item) => (
                      <li key={item} className="text-sm flex items-center gap-2" style={{ color: "#fff" }}>
                        <span style={{ color: "#c96a00" }}>✓</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: What Gets Installed */}
      <section id="whats-installed" className="px-6 md:px-12 py-16 md:py-24 relative z-50" style={{ backgroundColor: "#FFFFFF", transformOrigin: "center center", willChange: "transform, opacity" }} data-animate>
        <div className="max-w-5xl mx-auto">
          <p className="font-label text-xs tracking-[0.3em] font-medium mb-4 text-center" style={{ color: "#c96a00" }}>
            WHAT GETS INSTALLED
          </p>
          <h2
            className="text-3xl md:text-4xl lg:text-[2.5rem] leading-[1.15] mb-12 text-center"
            style={{ color: "#1a1a1a", fontFamily: "'Instrument Serif', Georgia, serif" }}
          >
            <span data-caption-line>The Contractor Circle <em className="not-italic" style={{ fontFamily: "'EB Garamond', Georgia, serif", fontStyle: "italic", fontSize: "1.05em" }}>Operating System</em></span>
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
            {[
              { num: "01", icon: <Settings size={20} />, title: "AOS", desc: "Vision. Rocks. Scorecard. L10. Issues. To-Dos. The full contractor operating system." },
              { num: "02", icon: <Video size={20} />, title: "Live Circle Calls", desc: "Bi-weekly on Sundays at 5 PM. Bring the real issues from your business." },
              { num: "03", icon: <Calendar size={20} />, title: "Monthly Bootcamp", desc: "Focused implementation sessions. Pick a system, build it, leave with it running." },
              { num: "04", icon: <Play size={20} />, title: "Replay Library", desc: "Every call, every bootcamp, every guest speaker. Training you can revisit anytime." },
              { num: "05", icon: <FileText size={20} />, title: "Templates + SOP Builder", desc: "Stop rebuilding from scratch. Proven frameworks ready to deploy." },
              { num: "06", icon: <Wrench size={20} />, title: "Contract Analyzer / ConstructLine", desc: "Estimating, scheduling, and the growing ALP ecosystem of contractor tools." },
            ].map((item) => (
              <div key={item.num} className="flex flex-col" data-card>
                <span className="text-lg font-bold mb-2" style={{ color: "#c96a00" }}>{item.num}</span>
                <div className="mb-2" style={{ color: "#1a1a1a" }}>{item.icon}</div>
                <h3 className="text-sm font-semibold mb-2" style={{ color: "#1a1a1a" }}>{item.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: "#666" }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 5: Proof */}
      <section className="px-6 md:px-12 py-16 md:py-24 relative z-[60]" style={{ backgroundColor: "#F5F1EB", transformOrigin: "center center", willChange: "transform, opacity" }} data-animate>
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="overflow-hidden" style={{ maxHeight: "400px" }}>
              <img
                src={CONSTRUCTION_BW}
                alt="Commercial construction site with cranes"
                className="w-full h-full object-cover object-center"
                style={{ maxHeight: "400px" }}
              />
            </div>
            <div>
              <p className="font-label text-xs tracking-[0.3em] font-medium mb-4" style={{ color: "#c96a00" }}>
                PROOF
              </p>
              <h2
                className="text-3xl md:text-4xl leading-[1.15] mb-6"
                style={{ color: "#1a1a1a", fontFamily: "'Instrument Serif', Georgia, serif" }}
              >
                <span className="block" data-caption-line>Built from{" "}<em className="not-italic" style={{ fontFamily: "'EB Garamond', Georgia, serif", fontStyle: "italic", fontSize: "1.15em", color: "#c96a00" }}>$2.5 billion</em></span>
                <span className="block mt-1" data-caption-line>in real construction.</span>
              </h2>
              <p className="text-base leading-relaxed" style={{ color: "#4a4a4a" }}>
                Not SaaS theory. Not motivational coaching. Not generic business advice. These are the systems, meetings, tools, and operating rhythms used to build real construction companies.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 6: Who This Is For */}
      <section className="px-6 md:px-12 py-16 md:py-24 relative z-[70]" style={{ backgroundColor: "#FFFFFF", transformOrigin: "center center", willChange: "transform, opacity" }} data-animate>
        <div className="max-w-5xl mx-auto">
          <p className="font-label text-xs tracking-[0.3em] font-medium mb-8 text-center" style={{ color: "#c96a00" }}>
            WHO THIS IS FOR
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="overflow-hidden" style={{ maxHeight: "380px" }}>
              <img
                src={PERSON_WINDOW}
                alt="Construction owner contemplating growth"
                className="w-full h-full object-cover object-center"
                style={{ maxHeight: "380px" }}
              />
            </div>
            <div className="space-y-5">
              {[
                "You are doing real volume but still feel trapped.",
                "You have PMs, but too much still runs through you.",
                "You want to scale, but the company needs structure first.",
                "You know the next level requires systems, not more hustle.",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle size={20} style={{ color: "#c96a00", flexShrink: 0, marginTop: "2px" }} />
                  <p className="text-base" style={{ color: "#1a1a1a" }}>{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section 7: Founding Membership */}
      <section className="px-6 md:px-12 py-16 md:py-24 relative z-[80] no-exit" style={{ backgroundColor: "#1a1a1a", transformOrigin: "center center", willChange: "transform, opacity" }} data-animate>
        <div className="max-w-4xl mx-auto text-center">
          <p className="font-label text-xs tracking-[0.3em] font-medium mb-6" style={{ color: "#c96a00" }}>
            FOUNDING MEMBERSHIP
          </p>
          <h2 className="text-4xl md:text-5xl lg:text-6xl mb-4" style={{ color: "#FFFFFF", fontFamily: "'Instrument Serif', Georgia, serif" }}>
            <span data-caption-line><em className="not-italic" style={{ fontFamily: "'EB Garamond', Georgia, serif", fontStyle: "italic", fontSize: "1.1em" }}>$497</em>/month</span>
          </h2>
          <p className="text-sm mb-10" style={{ color: "#aaa" }}>
            Includes live calls, bootcamps, replays, templates, tools, and full AOS access.
          </p>
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={startCheckout}
              disabled={isLoading}
              className="text-xs tracking-[0.2em] font-medium px-10 py-4 transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ backgroundColor: "#FFFFFF", color: "#1a1a1a" }}
            >
              {isLoading ? "LOADING..." : "JOIN THE CIRCLE"}
            </button>
            <p className="text-xs" style={{ color: "#888" }}>
              Limited founding memberships available.
            </p>
          </div>
        </div>
      </section>

      {/* Section 8: Trust Strip */}
      <section className="px-6 md:px-12 py-12 md:py-16 relative z-[90] no-exit" style={{ backgroundColor: "#F5F1EB", borderTop: "1px solid #e5e0d8", transformOrigin: "center center" }} data-animate>
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { icon: <Shield size={22} />, title: "$2.5B+", desc: "Built from real construction experience" },
              { icon: <Users size={22} />, title: "Private Community", desc: "Construction owners serious about scaling" },
              { icon: <Calendar size={22} />, title: "Weekly Rhythm", desc: "Live calls every Sunday at 5 PM" },
              { icon: <Settings size={22} />, title: "Proven Systems", desc: "Frameworks and tools that actually work" },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center text-center" data-card>
                <div className="mb-2" style={{ color: "#1a1a1a" }}>{item.icon}</div>
                <p className="text-sm font-semibold mb-1" style={{ color: "#1a1a1a" }}>{item.title}</p>
                <p className="text-xs" style={{ color: "#666" }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 md:px-12 py-8 relative z-[100]" style={{ backgroundColor: "#F5F1EB", borderTop: "1px solid #e5e0d8" }}>
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs" style={{ color: "#888" }}>© 2026 ALP Contractor Circle. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="https://alpcontractorschool.com" className="text-xs hover:opacity-70 transition-opacity" style={{ color: "#666" }}>ALP School</a>
            <a href="https://instagram.com/realmarshallwilkinson" className="text-xs hover:opacity-70 transition-opacity" style={{ color: "#666" }}>Instagram</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
