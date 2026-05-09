import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { fetchProfile, type ChatUser } from "@/lib/chat-hooks";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  /** Public profile of the signed-in user (no email). */
  profile: ChatUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ChatUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (!session?.user) {
      setProfile(null);
      return;
    }
    setProfile(await fetchProfile(session.user.id));
  };

  useEffect(() => {
    if (!session?.user) {
      setProfile(null);
      return;
    }
    let attempts = 0;
    let cancelled = false;
    const tick = async () => {
      const p = await fetchProfile(session.user.id);
      if (cancelled) return;
      if (p) {
        setProfile(p);
      } else if (attempts++ < 5) {
        // Profile row created by signup trigger may take a moment.
        setTimeout(tick, 400);
      }
    };
    tick();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, profile, loading, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
