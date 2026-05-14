import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col items-center justify-center gap-4 px-6 py-20 text-center"
    >
      <div className="relative">
        <motion.div
          aria-hidden
          className="absolute inset-0 rounded-3xl blur-2xl"
          style={{ background: "var(--gradient-primary)", opacity: 0.35 }}
          animate={{ scale: [0.95, 1.1, 0.95], opacity: [0.25, 0.45, 0.25] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl glass">
          <Icon className="h-9 w-9 text-primary" />
        </div>
      </div>
      <div className="max-w-xs">
        <h3 className="text-lg font-semibold">{title}</h3>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </motion.div>
  );
}
