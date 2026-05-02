import { motion } from "framer-motion";

interface Props {
  email: string;
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

export function Avatar({ email, size = 44, online }: Props) {
  const initial = (email[0] ?? "?").toUpperCase();
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = (hash * 31 + email.charCodeAt(i)) | 0;
  const bg = palette[Math.abs(hash) % palette.length];

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
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
