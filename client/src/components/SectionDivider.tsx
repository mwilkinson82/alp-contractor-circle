/**
 * SectionDivider — Animated horizontal line that expands from center.
 * Copper/amber gradient, triggers on scroll into view.
 */

import { motion } from "framer-motion";

export function SectionDivider() {
  return (
    <div className="relative z-10 py-6 px-4">
      <div className="max-w-md mx-auto">
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          whileInView={{ scaleX: 1, opacity: 1 }}
          viewport={{ once: true, margin: "-20px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-[1px] bg-gradient-to-r from-transparent via-ember/30 to-transparent origin-center"
        />
      </div>
    </div>
  );
}
