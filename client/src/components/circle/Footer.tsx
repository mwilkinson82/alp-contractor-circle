import { motion } from "framer-motion";

export function Footer() {
  return (
    <footer className="relative z-10 py-10 px-6 border-t border-cream/5">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-xs text-cream-muted/30"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          &copy; 2026 Altitude Logic Pressure. All rights reserved.
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex items-center gap-6"
        >
          <a
            href="https://altitudelogicpressure.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-cream-muted/40 hover:text-ember transition-colors duration-200"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            ALP Main Site
          </a>
          <a
            href="https://instagram.com/marshallwilkinson.alp"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-cream-muted/40 hover:text-ember transition-colors duration-200"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Instagram
          </a>
        </motion.div>
      </div>
    </footer>
  );
}
