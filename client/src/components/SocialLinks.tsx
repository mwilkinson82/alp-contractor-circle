/**
 * SocialLinks — Instagram social link with subtle pulse animation.
 * Design: Copper accent icon in frosted glass circle.
 */

import { motion } from "framer-motion";
import { Instagram } from "lucide-react";

export function SocialLinks() {
  return (
    <section className="relative z-10 py-8 px-4">
      <div className="max-w-md mx-auto flex flex-col items-center gap-4">
        {/* Divider */}
        <div className="w-8 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent mb-2" />

        <p
          className="text-xs font-medium tracking-[0.2em] uppercase text-cream-muted/60"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          Connect
        </p>

        <motion.a
          href="https://instagram.com/marshallwilkinson.alp"
          target="_blank"
          rel="noopener noreferrer"
          className="relative group"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          {/* Pulse ring */}
          <motion.div
            className="absolute inset-0 rounded-full border border-ember/30"
            animate={{
              scale: [1, 1.4, 1.4],
              opacity: [0.4, 0, 0],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeOut",
            }}
          />

          <div className="relative w-12 h-12 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center group-hover:bg-ember/10 group-hover:border-ember/25 transition-all duration-400">
            <Instagram className="w-5 h-5 text-cream-muted group-hover:text-ember transition-colors duration-300" />
          </div>
        </motion.a>
      </div>
    </section>
  );
}
