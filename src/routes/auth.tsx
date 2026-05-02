import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Mail, Lock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth-context";
import { AuroraBackground } from "@/components/AuroraBackground";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

type Mode = "signin" | "signup";

function AuthPage() {
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!authLoading && session) navigate({ to: "/chats", replace: true });
  }, [session, authLoading, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/chats` },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = async () => {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/chats`,
      });
      if (result.error) throw result.error;
      if (result.redirected) return;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Google sign-in failed";
      toast.error(msg);
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <AuroraBackground />
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="glass-strong w-full max-w-md rounded-3xl p-8 shadow-soft"
      >
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0.6, rotate: -12 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 16 }}
            className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary shadow-glow"
          >
            <ShieldCheck className="h-7 w-7 text-primary-foreground" />
          </motion.div>
          <h1 className="mt-4 text-3xl font-bold text-gradient">Veil</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin" ? "Welcome back. Step behind the veil." : "Create your private space."}
          </p>
        </div>

        <div className="mt-7 flex rounded-full glass p-1">
          {(["signin", "signup"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className="relative flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors"
            >
              {mode === m && (
                <motion.span
                  layoutId="auth-pill"
                  className="absolute inset-0 rounded-full gradient-primary shadow-glow"
                  transition={{ type: "spring", stiffness: 320, damping: 28 }}
                />
              )}
              <span
                className={`relative z-10 ${mode === m ? "text-primary-foreground" : "text-muted-foreground"}`}
              >
                {m === "signin" ? "Sign in" : "Sign up"}
              </span>
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <Field
            icon={<Mail className="h-4 w-4" />}
            type="email"
            placeholder="you@domain.com"
            value={email}
            onChange={setEmail}
            required
          />
          <Field
            icon={<Lock className="h-4 w-4" />}
            type="password"
            placeholder="Password"
            value={password}
            onChange={setPassword}
            required
            minLength={6}
          />
          <motion.button
            whileTap={{ scale: 0.97 }}
            disabled={busy}
            type="submit"
            className="flex h-12 w-full items-center justify-center rounded-2xl gradient-primary text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
          >
            <AnimatePresence mode="wait" initial={false}>
              {busy ? (
                <motion.span key="busy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Loader2 className="h-4 w-4 animate-spin" />
                </motion.span>
              ) : (
                <motion.span key="t" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {mode === "signin" ? "Sign in" : "Create account"}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>

        <button
          onClick={onGoogle}
          disabled={busy}
          className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl glass text-sm font-medium hover:bg-white/10 transition-colors disabled:opacity-60"
        >
          <GoogleIcon />
          Continue with Google
        </button>
      </motion.div>
    </div>
  );
}

function Field({
  icon,
  type,
  placeholder,
  value,
  onChange,
  required,
  minLength,
}: {
  icon: React.ReactNode;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <div className="group relative">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
        {icon}
      </span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        minLength={minLength}
        className="h-12 w-full rounded-2xl bg-input/60 pl-11 pr-4 text-sm outline-none ring-0 transition-all placeholder:text-muted-foreground focus:bg-input focus:ring-2 focus:ring-ring/60"
      />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.92c1.71-1.57 2.69-3.89 2.69-6.61z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.95v2.33A9 9 0 0 0 9 18z"
        fill="#34A853"
      />
      <path d="M3.97 10.71A5.4 5.4 0 0 1 3.68 9c0-.59.1-1.17.29-1.71V4.96H.95A9 9 0 0 0 0 9c0 1.45.35 2.82.95 4.04l3.02-2.33z" fill="#FBBC05" />
      <path
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 9 0 9 9 0 0 0 .95 4.96L3.97 7.3C4.68 5.18 6.66 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}
