import { Link, useLocation } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { MessageCircle, Users, Compass, User as UserIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Tab {
  to: "/chats" | "/groups" | "/explore" | "/profile";
  label: string;
  icon: LucideIcon;
}

const TABS: Tab[] = [
  { to: "/chats", label: "Chats", icon: MessageCircle },
  { to: "/groups", label: "Groups", icon: Users },
  { to: "/explore", label: "Explore", icon: Compass },
  { to: "/profile", label: "Profile", icon: UserIcon },
];

export function BottomNav() {
  const { pathname } = useLocation();

  return (
    <motion.nav
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 26, delay: 0.05 }}
      className="fixed bottom-0 left-0 right-0 z-30 flex justify-center pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2"
    >
      <ul className="glass-strong shadow-soft flex items-center gap-1 rounded-full border border-white/10 p-1.5">
        {TABS.map((tab) => {
          const active = pathname === tab.to || pathname.startsWith(`${tab.to}/`);
          const Icon = tab.icon;
          return (
            <li key={tab.to} className="relative">
              <Link
                to={tab.to}
                className="relative flex min-w-[64px] flex-col items-center justify-center gap-0.5 rounded-full px-4 py-2 text-[10px] font-medium tracking-wide"
                aria-current={active ? "page" : undefined}
              >
                {active && (
                  <motion.span
                    layoutId="bottom-nav-pill"
                    className="absolute inset-0 -z-10 rounded-full gradient-primary shadow-glow"
                    transition={{ type: "spring", stiffness: 320, damping: 28 }}
                  />
                )}
                <Icon
                  className={`h-5 w-5 transition-colors ${
                    active ? "text-primary-foreground" : "text-muted-foreground"
                  }`}
                />
                <span
                  className={`transition-colors ${
                    active ? "text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </motion.nav>
  );
}
