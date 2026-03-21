/**
 * ProductCard — Frosted glass card with glow border, scroll-triggered
 * stagger animation, hover/tap micro-interactions.
 * Design: Semi-transparent dark surface, copper accent border glow,
 * subtle scale on hover, arrow indicator for links.
 * 
 * Each card uses its own useInView hook for reliable per-card scroll detection.
 */

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { BookOpen, Target, GraduationCap, Users, FileText, Gem, ArrowUpRight, Lock, Download, Gift, ClipboardList, BarChart3, Send } from "lucide-react";

interface ProductCardProps {
  title: string;
  price: string;
  description: string;
  link: string;
  icon: "book" | "target" | "graduation" | "circle" | "file" | "diamond" | "download" | "gift" | "clipboard" | "chart" | "send";
  iconImage?: string;
  comingSoon?: boolean;
  badge?: string;
  isFree?: boolean;
  isApplication?: boolean;
  index: number;
}

const iconMap = {
  book: BookOpen,
  target: Target,
  graduation: GraduationCap,
  circle: Users,
  file: FileText,
  diamond: Gem,
  download: Download,
  gift: Gift,
  clipboard: ClipboardList,
  chart: BarChart3,
  send: Send,
};

export function ProductCard({
  title,
  price,
  description,
  link,
  icon,
  iconImage,
  comingSoon = false,
  badge,
  isFree = false,
  isApplication = false,
  index,
}: ProductCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(cardRef, { 
    once: true, 
    amount: 0.3,
    margin: "0px 0px -80px 0px"
  });
  const IconComponent = iconMap[icon];

  const cardContent = (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 40, scale: 0.97 }}
      animate={isInView 
        ? { opacity: 1, y: 0, scale: 1 } 
        : { opacity: 0, y: 40, scale: 0.97 }
      }
      transition={{
        duration: 0.6,
        delay: isInView ? index * 0.12 : 0,
        ease: [0.22, 1, 0.36, 1] as const,
      }}
      whileHover={!comingSoon ? { 
        scale: 1.025, 
        y: -3,
        transition: { duration: 0.25, ease: "easeOut" }
      } : undefined}
      whileTap={!comingSoon ? { 
        scale: 0.975,
        transition: { duration: 0.1 }
      } : undefined}
      className={`
        relative group rounded-xl overflow-hidden
        bg-[#12141A]/80 backdrop-blur-xl
        border border-white/[0.06]
        ${comingSoon 
          ? "opacity-60" 
          : "hover:border-ember/25 hover:shadow-[0_0_40px_-5px_rgba(212,145,92,0.18)]"
        }
      `}
      style={{ willChange: "transform, opacity" }}
    >
      {/* Inner glow gradient on hover */}
      {!comingSoon && (
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-ember/[0.06] via-transparent to-ember/[0.02] pointer-events-none" />
      )}

      {/* Top edge highlight on hover */}
      {!comingSoon && (
        <div className="absolute top-0 left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-transparent via-ember/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      )}

      <div className="relative p-4 sm:p-5 flex items-center gap-4">
        {/* Icon */}
        <div className="flex-shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center overflow-hidden group-hover:border-ember/15 transition-colors duration-400">
          {iconImage ? (
            <img src={iconImage} alt="" className="w-8 h-8 sm:w-9 sm:h-9 object-contain" />
          ) : (
            <IconComponent className="w-5 h-5 sm:w-6 sm:h-6 text-ember" strokeWidth={1.5} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <h3
              className="text-[15px] sm:text-base font-semibold text-cream"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              {title}
            </h3>
            {comingSoon && (
              <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-ember/10 border border-ember/20 text-ember text-[10px] font-semibold uppercase tracking-wider"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                <Lock className="w-2.5 h-2.5" />
                Soon
              </span>
            )}
            {badge && !comingSoon && (
              <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                isFree 
                  ? 'bg-emerald-500/15 border border-emerald-500/25 text-emerald-400'
                  : isApplication
                    ? 'bg-sky-500/15 border border-sky-500/25 text-sky-400'
                    : 'bg-ember/10 border border-ember/20 text-ember'
              }`}
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                {isFree && <Gift className="w-2.5 h-2.5" />}
                {isApplication && <Send className="w-2.5 h-2.5" />}
                {badge}
              </span>
            )}
          </div>
          <p className="text-[13px] sm:text-sm text-cream-muted/80 leading-snug line-clamp-2">
            {description}
          </p>
        </div>

        {/* Price & Arrow */}
        <div className="flex-shrink-0 flex flex-col items-end gap-1">
          {price && (
            <span
              className={`text-sm sm:text-base font-bold whitespace-nowrap ${
                isFree ? 'text-emerald-400' : 'text-ember'
              }`}
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              {price}
            </span>
          )}
          {!comingSoon && (
            <div className="w-7 h-7 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center group-hover:bg-ember/10 group-hover:border-ember/20 transition-all duration-300">
              <ArrowUpRight className="w-3.5 h-3.5 text-cream-muted group-hover:text-ember transition-colors duration-300 group-hover:translate-x-[1px] group-hover:-translate-y-[1px]" />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );

  if (comingSoon) {
    return <div className="cursor-default">{cardContent}</div>;
  }

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className="block no-underline"
    >
      {cardContent}
    </a>
  );
}
