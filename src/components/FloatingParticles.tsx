import { motion } from "framer-motion";
import { useMemo } from "react";

interface FloatingParticlesProps {
  count?: number;
}

/**
 * Minimal floating particles with very low opacity.
 * Slow, calm drift — inspired by Arc Browser and Linear's ambient backgrounds.
 */
export function FloatingParticles({ count = 18 }: FloatingParticlesProps) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => {
        // Deterministic-ish but varied per index
        const seed = (i + 1) * 9301;
        const rand = (n: number) => (Math.sin(seed * (n + 1)) + 1) / 2;
        return {
          id: i,
          left: rand(1) * 100,
          top: rand(2) * 100,
          size: 2 + rand(3) * 4,
          duration: 18 + rand(4) * 22,
          delay: rand(5) * -20,
          driftX: (rand(6) - 0.5) * 60,
          driftY: -(40 + rand(7) * 80),
          opacity: 0.06 + rand(8) * 0.1,
        };
      }),
    [count],
  );

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            filter: "blur(0.5px)",
          }}
          animate={{
            x: [0, p.driftX, 0],
            y: [0, p.driftY, 0],
            opacity: [p.opacity * 0.4, p.opacity, p.opacity * 0.4],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
