import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Bell,
  ChevronRight,
  LogOut,
  Moon,
  Pencil,
  ShieldCheck,
  Sparkles,
  UserX,
  Image as ImageIcon,
  Lock,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { Avatar } from "@/components/Avatar";
import { EditProfileDialog } from "@/components/EditProfileDialog";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/_app/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { profile, signOut } = useAuth();
  const [editing, setEditing] = useState(false);

  return (
    <div className="relative flex min-h-screen flex-col">
      <header className="glass-strong sticky top-0 z-20 border-b border-border/50 px-5 py-4">
        <h1 className="text-lg font-bold">Profile</h1>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Account, privacy and appearance
        </p>
      </header>

      <main className="scrollbar-thin flex-1 overflow-y-auto px-4 pb-32 pt-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="glass-strong relative overflow-hidden rounded-3xl p-6 shadow-soft"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -top-12 -right-12 h-44 w-44 rounded-full blur-3xl"
            style={{ background: "var(--gradient-primary)", opacity: 0.35 }}
          />
          <div className="relative flex items-center gap-4">
            <Avatar
              seed={profile?.id ?? "me"}
              name={profile?.display_name ?? profile?.username ?? "Me"}
              size={72}
              online
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xl font-bold">
                {profile?.display_name ?? profile?.username ?? "…"}
              </p>
              <p className="truncate text-sm text-muted-foreground">
                @{profile?.username ?? ""}
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full glass px-2.5 py-1 text-[10px] text-muted-foreground">
                <ShieldCheck className="h-3 w-3 text-primary" />
                Privacy-first account
              </div>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setEditing(true)}
            className="relative mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-2xl gradient-primary text-sm font-semibold text-primary-foreground shadow-glow"
          >
            <Pencil className="h-4 w-4" />
            Edit profile
          </motion.button>
        </motion.div>

        <Section title="Appearance" delay={0.05}>
          <Row
            icon={<Moon className="h-4 w-4" />}
            title="Dark mode"
            subtitle="Light theme coming soon"
            trailing={<ToggleStub on disabled />}
          />
        </Section>

        <Section title="Privacy" delay={0.1}>
          <Row
            icon={<Lock className="h-4 w-4" />}
            title="Privacy settings"
            subtitle="Control who can message you"
            trailing={<ChevronRight className="h-4 w-4 text-muted-foreground" />}
            disabled
          />
          <Row
            icon={<UserX className="h-4 w-4" />}
            title="Blocked users"
            subtitle="No one is blocked"
            trailing={<ChevronRight className="h-4 w-4 text-muted-foreground" />}
            disabled
          />
          <Row
            icon={<Bell className="h-4 w-4" />}
            title="Notifications"
            subtitle="Coming soon"
            trailing={<ChevronRight className="h-4 w-4 text-muted-foreground" />}
            disabled
          />
        </Section>

        <Section title="Shared media" delay={0.15}>
          <div className="px-2 py-3">
            <EmptyState
              icon={ImageIcon}
              title="No shared media yet"
              description="Photos, videos and files you share will appear here."
            />
          </div>
        </Section>

        <Section title="Account" delay={0.2}>
          <Row
            icon={<Sparkles className="h-4 w-4" />}
            title="Veil"
            subtitle="v0.1 — premium private messaging"
          />
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-destructive/15">
              <LogOut className="h-4 w-4" />
            </span>
            <span className="font-medium">Sign out</span>
          </motion.button>
        </Section>
      </main>

      <EditProfileDialog open={editing} onClose={() => setEditing(false)} />
    </div>
  );
}

function Section({
  title,
  children,
  delay = 0,
}: {
  title: string;
  children: ReactNode;
  delay?: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut", delay }}
      className="mt-5"
    >
      <h2 className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      <div className="glass-strong rounded-3xl p-2 shadow-soft">{children}</div>
    </motion.section>
  );
}

function Row({
  icon,
  title,
  subtitle,
  trailing,
  disabled,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl px-3 py-3 ${
        disabled ? "opacity-60" : "transition-colors hover:bg-white/5"
      }`}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-card/60 text-muted-foreground">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        {subtitle && <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>}
      </div>
      {trailing}
    </div>
  );
}

function ToggleStub({ on, disabled }: { on?: boolean; disabled?: boolean }) {
  return (
    <span
      className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors ${
        on ? "bg-primary" : "bg-card/60"
      } ${disabled ? "opacity-60" : ""}`}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        className={`mx-1 h-4 w-4 rounded-full bg-white shadow ${on ? "ml-5" : "ml-1"}`}
      />
    </span>
  );
}
