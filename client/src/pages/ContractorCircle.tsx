import { useEffect, useRef, useState, type RefObject } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import * as THREE from "three";
import {
  Archive,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  CircleDollarSign,
  ClipboardList,
  LockKeyhole,
  MessageSquare,
  Network,
  Play,
  Settings2,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";

import "./ContractorCircle.css";

type CloudflareStreamPlayer = {
  autoplay: boolean;
  controls: boolean;
  loop: boolean;
  muted: boolean;
  paused: boolean;
  play: () => Promise<void>;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
};

declare global {
  interface Window {
    Stream?: (element: HTMLIFrameElement) => CloudflareStreamPlayer;
  }
}

const CHECKOUT_URL =
  "https://checkout.stripe.com/c/pay/cs_live_b1eP29EJOBpUJ28uzK8888hg0lmTJ8gKGVEZZE0DFsAAcFCGXOMBsqlVuw#fid1d2BpamRhQ2prcSc%2FJ0xrcWB3JyknZ2p3YWB3VnF8aWAnPydhYGNkcGlxJykndnBndmZ3bHVxbGprUGtsdHBga2B2dkBrZGdpYGEnP2NkaXZgKSdicGRmZGhqaWBTZHdsZGtxJz8nZmprcXdqaScpJ2R1bE5gfCc%2FJ3VuWmlsc2BaMDRNVUk8QU9hQURQVlNdZ0s8dX1zMVdhcFN%2FMW5KXVB9UjF3MnFkZzdtYnVsal9BM040Z2dHQWpHT19wcUxAaXxXX3FJQGEyfEJzQ25QbHZHZ1E9fVFfa0Q1NXVuMTxxalxGJyknY3dqaFZgd3Ngdyc%2FcXdwYCknZ2RmbmJ3anBrYUZqaWp3Jz8nJmdnYDVjYycpJ2lkfGpwcVF8dWAnPydocGlxbFpscWBoJyknYGtkZ2lgVWlkZmBtamlhYHd2Jz9xd3BgeCUl";
const CLOUDFLARE_STREAM_ID = "5867cd561f133a4299bfb06e9e2f01d1";
const CLOUDFLARE_STREAM_SCRIPT_SRC =
  "https://embed.cloudflarestream.com/embed/sdk.latest.js";
const CLOUDFLARE_STREAM_IFRAME_SRC = `https://iframe.videodelivery.net/${CLOUDFLARE_STREAM_ID}?autoplay=true&muted=true&loop=true&controls=false&preload=auto&letterboxColor=transparent`;
const HERO_VIDEO_POSTER = "/contractor-circle/media/alp-hero-poster.webp";
const AOS_URL = "https://alpos.alpcontractorcircle.com";
const HANDBOOK_URL = "https://alphandbook.com";
const PORTAL_LOGIN_URL = "https://app.alpcontractorcircle.com/login";
const WHY_AOS_URL = "https://why.alpcontractorcircle.com";

const problemItems: Array<{ icon: LucideIcon; text: string }> = [
  { icon: Users, text: "Every decision comes back to you." },
  { icon: CalendarDays, text: "Selections are late." },
  { icon: UserRoundCheck, text: "PMs manage differently." },
  { icon: MessageSquare, text: "Meetings create talk, not traction." },
  { icon: CircleDollarSign, text: "Cash, schedule, and risk are reviewed too late." },
  { icon: LockKeyhole, text: "The company grows, but the owner gets trapped." },
];

const installedItems: Array<{
  number: string;
  icon: LucideIcon;
  title: string;
  outcome: string;
  body: string;
}> = [
  {
    number: "01",
    icon: Settings2,
    title: "AOS Application",
    outcome: "Unlimited workspaces + seats",
    body: "Vision. Rocks. Scorecard. L10. Issues. To-Dos. The contractor operating system your team can actually run.",
  },
  {
    number: "02",
    icon: Sparkles,
    title: "Marshall Guidance",
    outcome: "Real reads on real issues",
    body: "Ask Marshall, bring the constraint, and get the next move from the same playbooks behind the program.",
  },
  {
    number: "03",
    icon: Video,
    title: "Calls + Bootcamps",
    outcome: "Guidance becomes implementation",
    body: "Bi-weekly live calls plus monthly bootcamps. The room finds the issue, then builds the operating asset.",
  },
  {
    number: "04",
    icon: Play,
    title: "Replay Library",
    outcome: "Training that compounds",
    body: "Every call, every bootcamp, every guest speaker. Training you can revisit anytime.",
  },
  {
    number: "05",
    icon: BookOpen,
    title: "Templates + Handbook",
    outcome: "Doctrine plus deployable assets",
    body: "The field manual, AOS assets, and templates for contracts, estimating, finance, leadership, and operations.",
  },
  {
    number: "06",
    icon: Users,
    title: "Community + Tools",
    outcome: "A room between sessions",
    body: "Private Discord, command tools, Contract Readiness, SOP Builder, and the growing ALP operator toolset.",
  },
];

const productProofItems: Array<{
  number: string;
  eyebrow: string;
  headlineLines: [string, string];
  body: string;
  image: string;
  imageAlt: string;
  points: Array<{ label: string; value: string }>;
  links?: Array<{ label: string; href: string }>;
}> = [
  {
    number: "01",
    eyebrow: "Member Portal",
    headlineLines: ["The command center", "between calls."],
    body:
      "The portal is the front door of the Circle: Ask Marshall, calls, submissions, tools, templates, the vault, and the daily move all live in one place.",
    image: "/contractor-circle/proof/portal-ask-marshall.png",
    imageAlt: "ALP Contractor Circle member portal command center",
    points: [
      { label: "Command", value: "Ask, access, act." },
      { label: "Daily move", value: "One next action, not noise." },
      { label: "Member value", value: "Everything lives in one place." },
    ],
    links: [
      { label: "Open portal", href: "https://app.alpcontractorcircle.com" },
    ],
  },
  {
    number: "02",
    eyebrow: "Calls + Bootcamps",
    headlineLines: ["The room is live.", "The work is real."],
    body:
      "The live room and monthly bootcamps are where owner pressure becomes a decision, a tool, a template, or a system the company can use on Monday. The replays keep that leverage available after the call.",
    image: "/contractor-circle/proof/exact-bootcamp.png",
    imageAlt: "Contractor Circle bi-weekly call replay and bootcamp screen",
    points: [
      { label: "Live room", value: "Bring the real issue." },
      { label: "Bootcamp", value: "Build the system live." },
      { label: "Replay", value: "Every session stays useful." },
    ],
  },
  {
    number: "03",
    eyebrow: "AOS",
    headlineLines: ["The operating system", "is included."],
    body:
      "AOS is the weekly operating cadence: vision, people, data, issues, process, and traction in one application. Members get unlimited workspaces and unlimited seats.",
    image: "/contractor-circle/proof/exact-aos.png",
    imageAlt: "AOS scorecard showing weekly operating metrics and 13-week history",
    points: [
      { label: "Workspaces", value: "Unlimited companies and divisions." },
      { label: "Seats", value: "Unlimited team access." },
      { label: "Cadence", value: "Scorecard, rocks, issues, to-dos." },
    ],
    links: [
      { label: "Why AOS exists", href: WHY_AOS_URL },
      { label: "Open AOS app", href: AOS_URL },
    ],
  },
  {
    number: "04",
    eyebrow: "Templates",
    headlineLines: ["Templates that install", "the missing system."],
    body:
      "Templates give the team a starting point for work that should never live only in memory: preconstruction, buyout, change orders, billing, closeout, and recurring management.",
    image: "/contractor-circle/proof/exact-templates.png",
    imageAlt: "Contractor Circle template library page",
    points: [
      { label: "Library", value: "26 deployable templates." },
      { label: "Categories", value: "Contracts, estimating, finance, ops." },
      { label: "Use", value: "Start with the asset, then adapt." },
    ],
  },
  {
    number: "05",
    eyebrow: "ALP Handbook",
    headlineLines: ["The field manual", "comes with it."],
    body:
      "Members get the ALP Handbook as a full web experience: the doctrine, operating language, and field manual for building the company behind the projects.",
    image: "/contractor-circle/proof/exact-handbook.png",
    imageAlt: "ALP Handbook full web experience",
    points: [
      { label: "Format", value: "Full web handbook." },
      { label: "Doctrine", value: "Think, decide, document, lead." },
      { label: "Use", value: "Reference while operating." },
    ],
    links: [
      { label: "Open handbook", href: HANDBOOK_URL },
    ],
  },
  {
    number: "06",
    eyebrow: "Community",
    headlineLines: ["Discord is where", "the work continues."],
    body:
      "The private Discord server is the room between sessions: wins, estimating debates, numbers, field leadership, and the issues that earn time on the next call.",
    image: "/contractor-circle/proof/exact-community.png",
    imageAlt: "Contractor Circle Discord community page",
    points: [
      { label: "Members only", value: "Every account is active." },
      { label: "Always on", value: "Post overnight. Get a take by morning." },
      { label: "Feeds calls", value: "Threads become the agenda." },
    ],
  },
  {
    number: "07",
    eyebrow: "Ask Marshall",
    headlineLines: ["Ask the issue.", "Get the read."],
    body:
      "The reply page is where a vague owner problem becomes a clearer read, a recommendation, and a move the contractor can actually make.",
    image: "/contractor-circle/proof/portal-ask-reply.png",
    imageAlt: "Ask Marshall reply page with a detailed contractor issue response",
    points: [
      { label: "Context", value: "One question, one operating read." },
      { label: "Judgment", value: "What it means and what to do next." },
      { label: "Leverage", value: "Marshall's playbooks in the portal." },
    ],
    links: [
      { label: "Open portal", href: "https://app.alpcontractorcircle.com" },
    ],
  },
  {
    number: "08",
    eyebrow: "SOP Builder",
    headlineLines: ["The SOP is not a doc.", "It is the machine."],
    body:
      "The SOP Builder turns a seat, department, and constraint into a usable operating procedure with purpose, scope, triggers, inputs, steps, outputs, KPIs, and escalation rules.",
    image: "/contractor-circle/proof/exact-sop-builder.png",
    imageAlt: "SOP Priority Builder in the Operator's Workbench",
    points: [
      { label: "Seat", value: "Built by department and owner." },
      { label: "Procedure", value: "Steps, outputs, KPIs, exceptions." },
      { label: "Vault", value: "Save, email, download, revise." },
    ],
  },
  {
    number: "09",
    eyebrow: "Contract Readiness Scan",
    headlineLines: ["Vague problems become", "command packets."],
    body:
      "Upload the contract. The scan reads for cash, schedule, scope, and margin risk before the owner signs the thing that can hurt the job.",
    image: "/contractor-circle/proof/tool-contract-readiness.png",
    imageAlt: "Contract readiness scan tool with contract risk findings",
    points: [
      { label: "Cash", value: "Payment and collection risk." },
      { label: "Schedule", value: "LDs, notice, critical path exposure." },
      { label: "Output", value: "Sample language and negotiation points." },
    ],
  },
];

const fitItems: Array<{ icon: LucideIcon; text: string }> = [
  { icon: ShieldCheck, text: "You are doing real volume but still feel trapped." },
  { icon: Network, text: "You have PMs, but too much still runs through you." },
  { icon: ClipboardList, text: "You want to scale, but the company needs structure first." },
  { icon: Check, text: "You know the next level requires systems, not more hustle." },
];

const onboardingSteps = [
  {
    number: "01",
    title: "Welcome email",
    body: "Your receipt and first instructions arrive immediately, with the portal link, Discord invite, and the first moves.",
  },
  {
    number: "02",
    title: "Portal + Discord access",
    body: "You get into the Contractor Circle portal and the private room where members keep working between sessions.",
  },
  {
    number: "03",
    title: "Introduce yourself",
    body: "Post who you are, what you build, and the operating pressure you want help solving first.",
  },
  {
    number: "04",
    title: "Start with the assets",
    body: "Watch the replays, move through the playbooks, and pull the templates you need before the next live room.",
  },
  {
    number: "05",
    title: "Get into AOS",
    body: "Open AOS, watch the trainings, and start setting up the workspace your company will actually run from.",
  },
  {
    number: "06",
    title: "Prepare for the call",
    body: "Bring one real constraint to the bi-weekly call so guidance turns into a decision, tool, or system.",
  },
];

const stats = [
  {
    icon: CircleDollarSign,
    value: "$2.5B+",
    label: "Built from real construction experience",
  },
  {
    icon: Users,
    value: "Private Community",
    label: "Construction owners serious about scaling",
  },
  {
    icon: CalendarDays,
    value: "Weekly Rhythm",
    label: "Live calls every Sunday at 5 PM",
  },
  {
    icon: Archive,
    value: "Unlimited AOS Access",
    label: "Unlimited workspaces and unlimited seats",
  },
];

const proofStats = [
  { value: "$100M+", label: "Total revenue generated by members" },
  { value: "33x", label: "Average growth multiple shown on the main site" },
  { value: "1 Month", label: "Fastest reported result" },
  { value: "$2.5B+", label: "Construction experience behind the doctrine" },
];

const memberResults = [
  { company: "CNY Group", timeline: "18 months with ALP", before: "$600K", after: "$20M", multiple: "33x" },
  { company: "Trojan Roofing", timeline: "First year with ALP", before: "$300K", after: "$10M", multiple: "33x" },
  { company: "Davis Contracting", timeline: "6 months with ALP", before: "$1M", after: "$4M", multiple: "4x" },
  { company: "Sage Construction", timeline: "1 year with ALP", before: "$0", after: "$2M", multiple: "∞" },
  { company: "ARC Construction Group", timeline: "1 year with ALP", before: "$0", after: "$2M", multiple: "∞" },
];

const testimonials = [
  {
    quote:
      "Marshall's classes are one of a kind. He teaches lessons that would take you years to learn yourself.",
    name: "Olive Tree Builds",
  },
  {
    quote:
      "There is nothing like Marshall. This is real world stuff here. My 2nd month as a contractor and I'm at a quarter million in revenue.",
    name: "Sage Construction",
  },
  {
    quote:
      "ALP is super impactful. I have tried many other coaching programs, and none compare to what I've learned.",
    name: "Davis Contracting",
  },
];

function ProductProofCard({
  item,
}: {
  item: (typeof productProofItems)[number];
}) {
  const shotClassName = [
    "cc-product-shot",
    "cc-detail-reveal",
    "cc-product-shot-image",
  ].join(" ");

  return (
    <article className="cc-stack-card cc-stack-card-product-proof">
      <div className="cc-product-proof">
        <div className="cc-product-proof-copy cc-caption">
          <div className="cc-product-copy-main">
            <p className="cc-eyebrow" data-caption>
              {item.number} / {item.eyebrow}
            </p>
            <h2>
              {item.headlineLines.map((line) => (
                <span data-caption key={line}>{line}</span>
              ))}
            </h2>
            <p className="cc-subhead" data-caption>
              {item.body}
            </p>
            {item.links ? (
              <div className="cc-product-links cc-detail-reveal">
                {item.links.map((link) => (
                  <a key={link.href} href={link.href} target="_blank" rel="noreferrer">
                    {link.label}
                    <ArrowUpRight aria-hidden="true" />
                  </a>
                ))}
              </div>
            ) : null}
          </div>
          <div className="cc-proof-points">
            {item.points.map((point) => (
              <div className="cc-proof-point cc-detail-reveal" key={point.label}>
                <span>{point.label}</span>
                <strong>{point.value}</strong>
              </div>
            ))}
          </div>
        </div>

        <figure className={shotClassName}>
          <img src={item.image} alt={item.imageAlt} />
        </figure>
      </div>
    </article>
  );
}

function useCloudflareStreamRuntime() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (window.Stream) {
      setIsReady(true);
      return;
    }

    let script = document.querySelector<HTMLScriptElement>(
      `script[src="${CLOUDFLARE_STREAM_SCRIPT_SRC}"]`,
    );
    const handleLoad = () => setIsReady(true);

    if (!script) {
      script = document.createElement("script");
      script.src = CLOUDFLARE_STREAM_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    script.addEventListener("load", handleLoad);

    return () => {
      script.removeEventListener("load", handleLoad);
    };
  }, []);

  return isReady;
}

export default function ContractorCircle() {
  const rootRef = useRef<HTMLDivElement>(null);
  const streamFrameRef = useRef<HTMLIFrameElement>(null);
  const streamPlayerRef = useRef<CloudflareStreamPlayer | null>(null);
  const [muted, setMuted] = useState(true);
  const [videoUnavailable, setVideoUnavailable] = useState(false);
  const [showMobileCta, setShowMobileCta] = useState(false);

  const streamRuntimeReady = useCloudflareStreamRuntime();
  useContractorCircleMotion(rootRef);

  useEffect(() => {
    document.title =
      "ALP Contractor Circle | Operating System for Construction Owners";
    const description =
      "The Contractor Circle gives construction owners the operating system, tools, and weekly rhythm to scale without becoming the bottleneck.";
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = description;
  }, []);

  useEffect(() => {
    if (!streamRuntimeReady || !window.Stream || !streamFrameRef.current) {
      return;
    }

    const player = window.Stream(streamFrameRef.current);
    streamPlayerRef.current = player;
    const markReady = () => setVideoUnavailable(false);
    const markUnavailable = () => setVideoUnavailable(true);

    player.autoplay = true;
    player.controls = false;
    player.loop = true;
    player.muted = true;
    setMuted(true);
    player.addEventListener?.("canplay", markReady);
    player.addEventListener?.("playing", markReady);
    player.addEventListener?.("error", markUnavailable);
    void player.play().catch(() => undefined);

    return () => {
      player.removeEventListener?.("canplay", markReady);
      player.removeEventListener?.("playing", markReady);
      player.removeEventListener?.("error", markUnavailable);
      streamPlayerRef.current = null;
    };
  }, [streamRuntimeReady]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mobileQuery = window.matchMedia("(max-width: 860px)");
    const updateMobileCta = () => {
      const threshold = Math.min(760, window.innerHeight * 0.9);
      const shouldShow = mobileQuery.matches && window.scrollY > threshold;
      setShowMobileCta((current) => (current === shouldShow ? current : shouldShow));
    };

    updateMobileCta();
    window.addEventListener("scroll", updateMobileCta, { passive: true });
    window.addEventListener("resize", updateMobileCta);
    mobileQuery.addEventListener("change", updateMobileCta);

    return () => {
      window.removeEventListener("scroll", updateMobileCta);
      window.removeEventListener("resize", updateMobileCta);
      mobileQuery.removeEventListener("change", updateMobileCta);
    };
  }, []);

  const toggleAudio = () => {
    const player = streamPlayerRef.current;
    if (!player) return;
    player.muted = !player.muted;
    setMuted(player.muted);
    if (player.paused) void player.play().catch(() => undefined);
  };

  return (
    <div ref={rootRef} className="cc-page">
      <header className="cc-nav" aria-label="ALP Contractor Circle">
        <a href="#top" className="cc-brand" aria-label="ALP Contractor Circle home">
          <span>ALP</span>
          <span aria-hidden="true">|</span>
          <span>Contractor Circle</span>
        </a>
        <nav className="cc-nav-actions" aria-label="Primary">
          <a href={PORTAL_LOGIN_URL} className="cc-nav-link">
            Sign In
          </a>
          <a href={CHECKOUT_URL} className="cc-nav-button">
            Get Started
          </a>
        </nav>
      </header>

      <main id="top">
        <section className="cc-video-hero" aria-label="Contractor Circle introduction video">
          <div className="cc-video-media">
            <iframe
              ref={streamFrameRef}
              className="cc-video cc-stream-video"
              title="Contractor Circle introduction video"
              src={CLOUDFLARE_STREAM_IFRAME_SRC}
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              loading="eager"
              onLoad={() => setVideoUnavailable(false)}
              onError={() => setVideoUnavailable(true)}
            />
          </div>
          {videoUnavailable ? (
            <img
              className="cc-video-fallback"
              src={HERO_VIDEO_POSTER}
              alt=""
              aria-hidden="true"
            />
          ) : null}
          <div className="cc-video-shade" />
          {!videoUnavailable ? (
            <button className="cc-sound-button" type="button" onClick={toggleAudio}>
              {muted ? "Tap for Sound" : "Sound On"}
            </button>
          ) : null}
        </section>

        <section className="cc-chaos-panel" aria-label="From to-do lists to AOS">
          <img
            src="/contractor-circle/hero-chaos-aos.png"
            alt="From to-do lists that run your week to a system that runs your company"
          />
        </section>

        <section className="cc-hero-copy cc-caption">
          <SystemsField className="cc-hero-field" />
          <p className="cc-eyebrow" data-caption>Contractor Circle Operating System</p>
          <h1>
            <span data-caption>Build the company </span>
            <span data-caption>behind the projects.</span>
          </h1>
          <p className="cc-subhead" data-caption>
            Your competitors are installing systems. Contractor Circle gives
            construction owners AOS, the portal, tools, templates, replays, and
            the weekly rhythm to scale without becoming the bottleneck.
          </p>
          <div className="cc-hero-actions">
            <a href={CHECKOUT_URL} className="cc-button cc-button-dark">
              Join the Circle
            </a>
            <a href="#whats-installed" className="cc-inline-link">
              See what's inside
            </a>
          </div>
        </section>

        <section id="whats-installed" className="cc-card-stack" aria-label="Contractor Circle story">
          <div className="cc-stack-sticky">
            <article className="cc-stack-card cc-stack-card-problem">
              <div className="cc-stack-copy cc-caption">
                <h2>
                  <span data-caption>If everything flows back to the owner,</span>
                  <span data-caption>the owner is still the operating system.</span>
                </h2>
                <p className="cc-subhead" data-caption>
                  The leads are there. The jobs are there. The ambition is there.
                  But the company is still running through the owner's head.
                </p>
              </div>
              <div className="cc-problem-grid">
                {problemItems.map(({ icon: Icon, text }) => (
                  <article className="cc-problem-card" key={text}>
                    <Icon aria-hidden="true" />
                    <p>{text}</p>
                  </article>
                ))}
              </div>
            </article>

            <article className="cc-stack-card cc-stack-card-shift">
              <div className="cc-aos-ad cc-caption" aria-label="AOS memory is not management graphic">
                <img
                  className="cc-aos-ad-image cc-detail-reveal"
                  src="/contractor-circle/proof/aos-memory-graphic.png"
                  alt="AOS page graphic that says Memory is not management"
                />
              </div>
            </article>

            <article className="cc-stack-card cc-stack-card-installed">
              <div className="cc-centered-copy cc-caption">
                <p className="cc-eyebrow" data-caption>What Gets Installed</p>
                <h2>
                  <span data-caption>A live operating system,</span>
                  <span data-caption>not another course.</span>
                </h2>
                <p className="cc-subhead" data-caption>
                  AOS, Marshall guidance, live calls, monthly bootcamps, replays,
                  templates, the handbook, command tools, and the private room where
                  the work continues between sessions.
                </p>
              </div>
              <div className="cc-install-grid">
                {installedItems.map(({ number, icon: Icon, title, outcome, body }) => (
                  <article
                    className="cc-install-item"
                    key={number}
                    tabIndex={0}
                    aria-label={`${title}: ${outcome}`}
                  >
                    <span>{number}</span>
                    <Icon aria-hidden="true" />
                    <h3>{title}</h3>
                    <strong>{outcome}</strong>
                    <p>{body}</p>
                  </article>
                ))}
              </div>
            </article>

            {productProofItems.map((item) => (
              <ProductProofCard key={item.number} item={item} />
            ))}

            <article className="cc-stack-card cc-stack-card-proof">
              <div className="cc-proof-ledger">
                <div className="cc-proof-ledger-copy cc-caption">
                  <p className="cc-eyebrow" data-caption>Proof</p>
                  <h2>
                    <span data-caption>Real members.</span>
                    <span data-caption>Real operating leverage.</span>
                  </h2>
                  <p className="cc-subhead" data-caption>
                    Contractor Circle is not a theory deck. It is built from live
                    member results, the operating assets inside the portal, and the
                    weekly room where contractors keep doing the work.
                  </p>
                  <a href={CHECKOUT_URL} className="cc-button cc-button-dark" data-caption>
                    Join the Circle
                  </a>
                </div>
                <div className="cc-proof-ledger-visual cc-detail-reveal">
                  <div className="cc-proof-stat-grid">
                    {proofStats.map((stat) => (
                      <div className="cc-proof-stat" key={stat.value}>
                        <strong>{stat.value}</strong>
                        <span>{stat.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="cc-member-results" aria-label="Member growth examples">
                    {memberResults.map((result) => (
                      <article className="cc-member-result" key={result.company}>
                        <header>
                          <div>
                            <strong>{result.company}</strong>
                            <span>{result.timeline}</span>
                          </div>
                          <em>{result.multiple}</em>
                        </header>
                        <dl>
                          <div>
                            <dt>Before</dt>
                            <dd>{result.before}</dd>
                          </div>
                          <div>
                            <dt>After ALP</dt>
                            <dd>{result.after}</dd>
                          </div>
                        </dl>
                      </article>
                    ))}
                  </div>
                  <div className="cc-testimonial-strip" aria-label="Member testimonials">
                    {testimonials.map((testimonial) => (
                      <figure className="cc-testimonial" key={testimonial.name}>
                        <div className="cc-testimonial-mark" aria-hidden="true">
                          5 star member read
                        </div>
                        <blockquote>"{testimonial.quote}"</blockquote>
                        <figcaption>
                          {testimonial.name}
                          <span>ALP Member</span>
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                  <p className="cc-proof-disclaimer">
                    Results vary. These are real members who committed to the process,
                    showed up consistently, and executed on what they learned.
                  </p>
                </div>
              </div>
            </article>

            <article className="cc-stack-card cc-stack-card-fit">
              <div className="cc-fit-diagnostic">
                <div className="cc-caption">
                  <p className="cc-eyebrow" data-caption>Who This Is For</p>
                  <h2>
                    <span data-caption>For owners doing real volume,</span>
                    <span data-caption>but still carrying the company.</span>
                  </h2>
                  <p className="cc-subhead" data-caption>
                    If the business is growing and the operating pressure still
                    routes through you, the next level is not more hustle. It is
                    a system your team can use without waiting on your memory.
                  </p>
                  <div className="cc-fit-list">
                    {fitItems.map(({ icon: Icon, text }) => (
                      <article key={text} className="cc-fit-item">
                        <Icon aria-hidden="true" />
                        <p>{text}</p>
                      </article>
                    ))}
                  </div>
                </div>
                <aside className="cc-owner-panel cc-detail-reveal">
                  <span>Owner signal</span>
                  <strong>You are still the hub.</strong>
                  <p>
                    PMs ask. Finance waits. Decisions bounce back. Meetings end
                    with talk, but not enough visible ownership.
                  </p>
                  <div>
                    <b>What changes</b>
                    <small>Vision, numbers, issues, to-dos, roles, and tools move into a weekly operating rhythm.</small>
                  </div>
                </aside>
              </div>
            </article>

            <article id="after-checkout" className="cc-stack-card cc-stack-card-onboarding">
              <div className="cc-onboarding-card">
                <div className="cc-onboarding-copy cc-caption">
                  <p className="cc-eyebrow" data-caption>After Checkout</p>
                  <h2>
                    <span data-caption>What happens</span>
                    <span data-caption>after you join.</span>
                  </h2>
                  <p className="cc-subhead" data-caption>
                    You are not buying a login and being left alone. The first
                    week is designed to get you into the room, into the portal,
                    into AOS, and into the next live conversation with a real issue.
                  </p>
                  <a href={CHECKOUT_URL} className="cc-button cc-button-dark" data-caption>
                    Join the Circle
                  </a>
                </div>
                <div className="cc-onboarding-steps" aria-label="What happens after joining">
                  {onboardingSteps.map((step) => (
                    <article className="cc-onboarding-step cc-detail-reveal" key={step.number}>
                      <span>{step.number}</span>
                      <div>
                        <h3>{step.title}</h3>
                        <p>{step.body}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </article>

            <article className="cc-stack-card cc-stack-card-close">
              <div className="cc-close-card cc-caption">
                <p className="cc-eyebrow" data-caption>Get Control Now</p>
                <h2>
                  <span data-caption>Get control now.</span>
                  <span data-caption>Build the real business.</span>
                </h2>
                <p className="cc-subhead" data-caption>
                  Your confusion ends when the company has cadence, numbers,
                  ownership, and tools. Your profit is hiding in the system.
                </p>
                <div className="cc-close-steps">
                  {[
                    ["Clarity", "See the real constraint."],
                    ["Control", "Put an owner and cadence on it."],
                    ["Profit", "Protect margin before it leaks."],
                  ].map(([label, text]) => (
                    <div className="cc-close-step cc-detail-reveal" key={label}>
                      <span>{label}</span>
                      <strong>{text}</strong>
                    </div>
                  ))}
                </div>
                <a href={CHECKOUT_URL} className="cc-button cc-button-light">
                  Join the Circle
                </a>
              </div>
            </article>

            <article className="cc-stack-card cc-stack-card-pricing">
              <div className="cc-pricing-copy cc-caption">
                <p className="cc-eyebrow" data-caption>Founding Membership</p>
                <h2>
                  <span data-caption><em>$497</em>/month</span>
                </h2>
                <p className="cc-subhead" data-caption>
                  Includes live calls, bootcamps, replays, templates, tools, and
                  full AOS access with unlimited workspaces and unlimited seats.
                </p>
                <a href={CHECKOUT_URL} className="cc-button cc-button-light">
                  Join the Circle
                </a>
                <p className="cc-fine-print">Limited founding memberships available.</p>
              </div>
            </article>
          </div>
        </section>

        <section className="cc-stats" aria-label="Contractor Circle proof points">
          <div className="cc-section-inner cc-stats-grid">
            {stats.map(({ icon: Icon, value, label }) => (
              <article key={value} className="cc-stat">
                <Icon aria-hidden="true" />
                <p>{value}</p>
                <span>{label}</span>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="cc-footer">
        <p>© 2026 ALP Contractor Circle. All rights reserved.</p>
        <div>
          <a href={HANDBOOK_URL} target="_blank" rel="noreferrer">ALP Handbook</a>
          <a href={AOS_URL} target="_blank" rel="noreferrer">AOS</a>
          <a href="https://instagram.com/realmarshallwilkinson" target="_blank" rel="noreferrer">
            Instagram
          </a>
        </div>
      </footer>

      <a
        href={CHECKOUT_URL}
        className={`cc-mobile-sticky-cta${showMobileCta ? " is-visible" : ""}`}
        aria-hidden={!showMobileCta}
        tabIndex={showMobileCta ? 0 : -1}
      >
        <span>Join the Circle</span>
        <strong>$497/mo</strong>
      </a>
    </div>
  );
}

function useContractorCircleMotion(rootRef: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof window === "undefined") return;

    gsap.registerPlugin(ScrollTrigger);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isCompact = window.matchMedia("(max-width: 860px)").matches;
    const ctx = gsap.context(() => {
      if (reduceMotion) {
        gsap.set(
          "[data-caption], .cc-reveal, .cc-chaos-panel img, .cc-hero-copy, .cc-problem-card, .cc-install-item, .cc-fit-item, .cc-aos-row, .cc-aos-core, .cc-detail-reveal, .cc-stat",
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            filter: "none",
            clipPath: "inset(0% 0% 0% 0% round 0px)",
          },
        );
        return;
      }

      if (isCompact) {
        gsap.set(
          "[data-caption], .cc-reveal, .cc-problem-card, .cc-install-item, .cc-fit-item, .cc-aos-row, .cc-aos-core, .cc-detail-reveal, .cc-hero-actions, .cc-product-links, .cc-stat",
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            filter: "none",
            clipPath: "inset(0% 0% 0% 0% round 0px)",
          },
        );
        gsap.set(".cc-stack-card", {
          autoAlpha: 1,
          xPercent: 0,
          yPercent: 0,
          y: 0,
          scale: 1,
          filter: "none",
        });

        gsap.to(".cc-video-media", {
          autoAlpha: 0.72,
          scale: 1,
          ease: "none",
          scrollTrigger: {
            trigger: ".cc-video-hero",
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
        });

        gsap.utils
          .toArray<HTMLElement>(".cc-chaos-panel img, .cc-hero-copy, .cc-stack-card, .cc-stat")
          .forEach((section) => {
            gsap.fromTo(
              section,
              { autoAlpha: 0, y: 28 },
              {
                autoAlpha: 1,
                y: 0,
                duration: 0.72,
                ease: "power3.out",
                scrollTrigger: {
                  trigger: section,
                  start: "top 92%",
                  once: true,
                },
              },
            );
          });
        return;
      }

      gsap.set("[data-caption]", {
        autoAlpha: 0,
        y: 26,
        filter: "blur(5px)",
      });

      gsap.to(".cc-video-media", {
        scale: 1.08,
        autoAlpha: 0.58,
        ease: "none",
        scrollTrigger: {
          trigger: ".cc-video-hero",
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });

      const chaosPanel = root.querySelector<HTMLElement>(".cc-chaos-panel");
      const chaosImage = root.querySelector<HTMLElement>(".cc-chaos-panel img");
      if (chaosPanel && chaosImage) {
        gsap.fromTo(
          chaosImage,
          {
            autoAlpha: 0.12,
            y: 92,
            scale: 0.92,
            filter: "blur(10px) brightness(0.72)",
            clipPath: "inset(11% 12% 11% 12% round 18px)",
          },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            filter: "blur(0px) brightness(1)",
            clipPath: "inset(0% 0% 0% 0% round 0px)",
            ease: "power3.inOut",
            scrollTrigger: {
              trigger: chaosPanel,
              start: "top 86%",
              end: "center 42%",
              scrub: 0.9,
              invalidateOnRefresh: true,
            },
          },
        );
      }

      const heroCopy = root.querySelector<HTMLElement>(".cc-hero-copy");
      if (heroCopy) {
        const heroCaptionLines = heroCopy.querySelectorAll<HTMLElement>("[data-caption]");
        const heroActions = heroCopy.querySelectorAll<HTMLElement>(".cc-hero-actions");
        gsap.set(heroActions, { autoAlpha: 0, y: 28 });
        const heroTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: heroCopy,
            start: "top 84%",
            end: "center 40%",
            scrub: 0.85,
            invalidateOnRefresh: true,
          },
        });

        heroTimeline.fromTo(
          heroCopy,
          {
            autoAlpha: 0.18,
            y: 84,
            scale: 0.965,
            filter: "blur(10px)",
          },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            filter: "blur(0px)",
            ease: "power3.inOut",
            duration: 1,
          },
          0,
        );

        if (heroCaptionLines.length) {
          heroTimeline.to(
            heroCaptionLines,
            {
              autoAlpha: 1,
              y: 0,
              filter: "blur(0px)",
              ease: "power3.out",
              stagger: 0.08,
              duration: 0.76,
            },
            0.12,
          );
        }

        if (heroActions.length) {
          heroTimeline.to(
            heroActions,
            {
              autoAlpha: 1,
              y: 0,
              ease: "power3.out",
              duration: 0.54,
              immediateRender: false,
            },
            0.48,
          );
        }
      }

      gsap.utils.toArray<HTMLElement>(".cc-reveal").forEach((section) => {
        gsap.fromTo(
          section,
          { autoAlpha: 0, y: 34 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.85,
            ease: "power3.out",
            scrollTrigger: {
              trigger: section,
              start: "top 82%",
              once: true,
            },
          },
        );
      });

      const animateCaption = (card: HTMLElement) => {
        const lines = card.querySelectorAll<HTMLElement>("[data-caption]");
        const detailItems = card.querySelectorAll<HTMLElement>(
          ".cc-problem-card, .cc-install-item, .cc-fit-item, .cc-aos-row, .cc-aos-core, .cc-detail-reveal",
        );
        if (card.dataset.captionPlayed === "true") return;
        card.dataset.captionPlayed = "true";
        if (lines.length) {
          gsap.to(lines, {
            autoAlpha: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 0.92,
            stagger: 0.075,
            ease: "power3.out",
          });
        }
        if (detailItems.length) {
          gsap.fromTo(
            detailItems,
            { autoAlpha: 0, y: 24 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.58,
              stagger: 0.055,
              ease: "power3.out",
              delay: 0.12,
            },
          );
        }
      };

      const addCaptionToTimeline = (
        timeline: gsap.core.Timeline,
        card: HTMLElement,
        at: number,
      ) => {
        const lines = card.querySelectorAll<HTMLElement>("[data-caption]");
        const detailItems = card.querySelectorAll<HTMLElement>(
          ".cc-problem-card, .cc-install-item, .cc-fit-item, .cc-aos-row, .cc-aos-core, .cc-detail-reveal",
        );

        if (lines.length) {
          timeline.to(
            lines,
            {
              autoAlpha: 1,
              y: 0,
              filter: "blur(0px)",
              duration: 0.48,
              stagger: 0.055,
              ease: "power3.out",
            },
            at,
          );
        }

        if (detailItems.length) {
          timeline.fromTo(
            detailItems,
            { autoAlpha: 0, y: 22 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.48,
              stagger: 0.035,
              ease: "power3.out",
              immediateRender: false,
            },
            at + 0.05,
          );
        }
      };

      const stack = root.querySelector<HTMLElement>(".cc-card-stack");
      const stackStage = root.querySelector<HTMLElement>(".cc-stack-sticky");
      const stackCards = gsap.utils.toArray<HTMLElement>(".cc-stack-card");
      const usePinnedStack = !window.matchMedia("(max-width: 860px)").matches;
      if (stack && stackStage && stackCards.length && usePinnedStack) {
        gsap.set(stackCards, {
          xPercent: -50,
          yPercent: -50,
          zIndex: (index) => 10 + index,
          filter: "brightness(1)",
        });
        gsap.set(stackCards.slice(1), {
          yPercent: 112,
          scale: 0.985,
          autoAlpha: 0,
        });
        gsap.set(stackCards[0], { autoAlpha: 1, xPercent: -50, yPercent: -50 });
        gsap.set(".cc-problem-card, .cc-install-item, .cc-fit-item, .cc-aos-row, .cc-aos-core, .cc-detail-reveal", {
          autoAlpha: 0,
          y: 22,
        });
        const stackCaptionTargets = stackCards.flatMap((card) =>
          Array.from(card.querySelectorAll<HTMLElement>("[data-caption]")),
        );
        const laterStackCaptionTargets = stackCards.slice(1).flatMap((card) =>
          Array.from(card.querySelectorAll<HTMLElement>("[data-caption]")),
        );
        gsap.set(stackCaptionTargets, {
          autoAlpha: 1,
          y: 0,
          filter: "blur(0px)",
        });
        gsap.set(laterStackCaptionTargets, {
          autoAlpha: 0.24,
          y: 18,
          filter: "blur(3px)",
        });
        gsap.set(".cc-install-item, .cc-fit-item, .cc-aos-row, .cc-aos-core, .cc-detail-reveal", {
          autoAlpha: 0.16,
          y: 18,
        });
        gsap.set(stackCards[0].querySelectorAll<HTMLElement>("[data-caption], .cc-problem-card"), {
          autoAlpha: 1,
          y: 0,
          filter: "blur(0px)",
        });

        const stackTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: stack,
            start: "top top",
            end: () => `+=${stackCards.length * window.innerHeight * 1.05}`,
            scrub: 0.85,
            pin: stackStage,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });

        addCaptionToTimeline(stackTimeline, stackCards[0], 0);

        stackCards.forEach((card, index) => {
          if (index === 0) return;
          const previous = stackCards[index - 1];
          const at = 0.82 + (index - 1) * 1.12;
          const activeYOffset = Math.min(index * 0.72, 7.5);
          const activeScale = 1 - Math.min(index * 0.004, 0.05);
          const previousYOffset = Math.min(index * 0.8, 10);
          const previousScale = 0.956 - Math.min(index * 0.006, 0.074);

          stackTimeline.to(
            card,
            {
              autoAlpha: 1,
              yPercent: -50 + activeYOffset,
              scale: activeScale,
              ease: "power3.inOut",
              duration: 0.95,
            },
            at,
          );

          stackTimeline.to(
            previous,
            {
              yPercent: -53 - previousYOffset,
              scale: previousScale,
              filter: "brightness(0.9)",
              ease: "power3.inOut",
              duration: 0.95,
            },
            at,
          );

          addCaptionToTimeline(stackTimeline, card, at);
        });
      } else {
        stackCards.forEach((card) => {
          ScrollTrigger.create({
            trigger: card,
            start: "top 78%",
            once: true,
            onEnter: () => animateCaption(card),
          });
        });
      }

      gsap.utils
        .toArray<HTMLElement>(".cc-caption")
        .filter((caption) => !caption.closest(".cc-stack-card") && !caption.closest(".cc-hero-copy"))
        .forEach((caption) => {
          const lines = caption.querySelectorAll<HTMLElement>("[data-caption]");
          if (!lines.length) return;
          gsap.to(lines, {
            autoAlpha: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 0.9,
            stagger: 0.07,
            ease: "power3.out",
            scrollTrigger: {
              trigger: caption,
              start: "top 84%",
              once: true,
            },
          });
        });

      const staggerGroups = [
        [".cc-stats-grid", ".cc-stat"],
      ] as const;

      staggerGroups.forEach(([trigger, targets]) => {
        gsap.from(targets, {
          autoAlpha: 0,
          y: 22,
          duration: 0.55,
          stagger: 0.06,
          ease: "power2.out",
          scrollTrigger: {
            trigger,
            start: "top 80%",
            once: true,
          },
        });
      });
    }, root);

    return () => ctx.revert();
  }, [rootRef]);
}

function SystemsField({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === "undefined") return;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0, 7);

    const group = new THREE.Group();
    scene.add(group);

    const warmLine = new THREE.LineBasicMaterial({
      color: 0xe26a2c,
      transparent: true,
      opacity: 0.34,
    });
    const inkLine = new THREE.LineBasicMaterial({
      color: 0x1b1b1a,
      transparent: true,
      opacity: 0.12,
    });

    const makeGrid = (size: number, step: number, z: number, material: THREE.Material) => {
      const vertices: number[] = [];
      for (let i = -size; i <= size; i += step) {
        vertices.push(-size, i, z, size, i, z);
        vertices.push(i, -size, z, i, size, z);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
      const lines = new THREE.LineSegments(geometry, material);
      group.add(lines);
      return geometry;
    };

    const geometries = [
      makeGrid(3.6, 0.6, 0, warmLine),
      makeGrid(4.4, 0.88, -0.35, inkLine),
    ];

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let animationId = 0;

    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      const nextWidth = Math.max(1, Math.floor(width));
      const nextHeight = Math.max(1, Math.floor(height));
      renderer.setSize(nextWidth, nextHeight, false);
      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
    };

    const render = () => {
      frame += 0.004;
      if (!reduceMotion) {
        group.rotation.x = -0.42 + Math.sin(frame) * 0.035;
        group.rotation.y = 0.44 + Math.cos(frame * 0.8) * 0.04;
        group.position.y = Math.sin(frame * 0.7) * 0.05;
      }
      renderer.render(scene, camera);
      animationId = window.requestAnimationFrame(render);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();
    render();

    return () => {
      window.cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      geometries.forEach((geometry) => geometry.dispose());
      warmLine.dispose();
      inkLine.dispose();
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
