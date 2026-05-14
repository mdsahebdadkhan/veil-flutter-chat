import { motion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Smooth fade + subtle slide between routes.
 * Wrap each top-level route component with this to opt-in to the transition.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="contents"
    >
      {children}
    </motion.div>
  );
}
