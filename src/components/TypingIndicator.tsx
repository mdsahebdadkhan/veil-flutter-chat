import { motion } from "framer-motion";

interface Props {
  label?: string;
}

/** Animated three-dot typing bubble used in chat threads. */
export function TypingIndicator({ label }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className="mt-2 flex items-end gap-2"
    >
      <div className="bg-bubble-them text-bubble-them-foreground rounded-2xl rounded-bl-md px-4 py-3 shadow-bubble">
        {label && <p className="mb-1 text-[11px] font-semibold text-primary">{label}</p>}
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="block h-1.5 w-1.5 rounded-full bg-muted-foreground/70"
              animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.15,
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
