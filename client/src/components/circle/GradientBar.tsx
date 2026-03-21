import { motion } from "framer-motion";

export function GradientBar() {
  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[2px] z-50"
      style={{
        background: "linear-gradient(90deg, transparent 0%, oklch(0.72 0.12 55) 30%, oklch(0.78 0.10 55) 50%, oklch(0.72 0.12 55) 70%, transparent 100%)",
      }}
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 1 }}
      transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
    />
  );
}
