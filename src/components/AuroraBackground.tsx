import { motion } from "framer-motion";

export function AuroraBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <motion.div
        className="absolute -top-32 -left-32 h-[480px] w-[480px] rounded-full blur-3xl"
        style={{ background: "oklch(0.55 0.22 295 / 0.45)" }}
        animate={{ x: [0, 60, 0], y: [0, 40, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-40 -right-32 h-[520px] w-[520px] rounded-full blur-3xl"
        style={{ background: "oklch(0.55 0.24 320 / 0.4)" }}
        animate={{ x: [0, -50, 0], y: [0, -30, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-1/3 left-1/2 h-[360px] w-[360px] -translate-x-1/2 rounded-full blur-3xl"
        style={{ background: "oklch(0.45 0.20 250 / 0.35)" }}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
