import { motion } from "framer-motion";

interface Props {
  /** Stable seed for color (e.g. user id or username). */
  seed: string;
  /** Display name or username, used for the initial letter and a11y label. */
  name: string;
  size?: number;
  online?: boolean;
}

const palette = [
  "linear-gradient(135deg,#a78bfa,#f472b6)",
  "linear-gradient(135deg,#60a5fa,#a78bfa)",
  "linear-gradient(135deg,#f472b6,#fb7185)",
  "linear-gradient(135deg,#34d399,#60a5fa)",
  "linear-gradient(135deg,#fbbf24,#f472b6)",
  "linear-gradient(135deg,#22d3ee,#a78bfa)",
];

export function Avatar({ seed, name, size = 44, online }: Props) {
  const initial = (name?.[0] ?? seed?.[0] ?? "?").toUpperCase();
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  const bg = palette[Math.abs(hash) % palette.length];

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} aria-label={name}>
      <motion.div
        whileHover={{ scale: 1.05 }}
        className="flex h-full w-full items-center justify-center rounded-full text-white font-semibold shadow-bubble"
        style={{ background: bg, fontSize: size * 0.42 }}
      >
        {initial}
      </motion.div>
      {online !== undefined && (
        <span
          className={`absolute bottom-0 right-0 h-3 w-3 rounded-full ring-2 ring-background ${online ? "bg-online" : "bg-muted-foreground"}`}
        />
      )}
    </div>
  );
}
