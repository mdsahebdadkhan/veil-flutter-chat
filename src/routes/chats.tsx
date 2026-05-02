import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Plus, Search, ShieldCheck, MessageCircle, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useConversations, useDirectory } from "@/lib/chat-hooks";
import { Avatar } from "@/components/Avatar";
import { AuroraBackground } from "@/components/AuroraBackground";
import { formatDistanceToNowStrict } from "date-fns";

export const Route = createFileRoute("/chats")({
  component: ChatsPage,
});

function ChatsPage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [showDirectory, setShowDirectory] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", replace: true });
  }, [user, loading, navigate]);

  const { conversations, loading: convLoading } = useConversations(user?.id);
  const { users } = useDirectory(user?.id);

  const filtered = useMemo(
    () =>
      query
        ? conversations.filter((c) => c.peer.email.toLowerCase().includes(query.toLowerCase()))
        : conversations,
    [conversations, query]
  );

  if (!user) return null;

  return (
    <div className="relative flex min-h-screen flex-col">
      <AuroraBackground />

      <header className="glass-strong sticky top-0 z-20 flex items-center justify-between border-b border-border/50 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary shadow-glow">
            <ShieldCheck className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gradient leading-none">Veil</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">{user.email}</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="rounded-full glass p-2.5 hover:bg-white/10 transition-colors"
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </header>

      <div className="px-5 pt-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations…"
            className="h-11 w-full rounded-2xl bg-input/60 pl-11 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:bg-input focus:ring-2 focus:ring-ring/60"
          />
        </div>
      </div>

      <main className="scrollbar-thin flex-1 overflow-y-auto px-3 pb-28 pt-3">
        {convLoading ? (
          <div className="space-y-2 px-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-card/40" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState onStart={() => setShowDirectory(true)} />
        ) : (
          <ul className="space-y-1">
            <AnimatePresence initial={false}>
              {filtered.map((c, i) => (
                <motion.li
                  key={c.peer.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.03, duration: 0.3 }}
                >
                  <Link
                    to="/chat/$peerId"
                    params={{ peerId: c.peer.id }}
                    className="flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-white/5"
                  >
                    <Avatar email={c.peer.email} online />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold">{c.peer.email}</span>
                        <span className="text-[11px] text-muted-foreground shrink-0">
                          {formatDistanceToNowStrict(new Date(c.lastAt), { addSuffix: false })}
                        </span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground mt-0.5">{c.lastText}</p>
                    </div>
                  </Link>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </main>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => setShowDirectory(true)}
        className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full gradient-primary shadow-glow"
        aria-label="New chat"
      >
        <Plus className="h-6 w-6 text-primary-foreground" />
      </motion.button>

      <AnimatePresence>
        {showDirectory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
            onClick={() => setShowDirectory(false)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-strong w-full max-w-lg rounded-t-3xl p-5 sm:rounded-3xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold">Start a conversation</h2>
                <button
                  onClick={() => setShowDirectory(false)}
                  className="rounded-full glass p-2 hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ul className="scrollbar-thin max-h-[60vh] space-y-1 overflow-y-auto">
                {users.length === 0 && (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    No other users yet. Invite someone to Veil!
                  </p>
                )}
                {users.map((u, i) => (
                  <motion.li
                    key={u.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Link
                      to="/chat/$peerId"
                      params={{ peerId: u.id }}
                      onClick={() => setShowDirectory(false)}
                      className="flex items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-white/5"
                    >
                      <Avatar email={u.email} online />
                      <span className="truncate text-sm font-medium">{u.email}</span>
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EmptyState({ onStart }: { onStart: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center gap-4 px-6 py-20 text-center"
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl glass">
        <MessageCircle className="h-9 w-9 text-primary" />
      </div>
      <div>
        <h3 className="text-lg font-semibold">No conversations yet</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Tap + to start your first encrypted chat.
        </p>
      </div>
      <button
        onClick={onStart}
        className="rounded-full gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
      >
        Start a chat
      </button>
    </motion.div>
  );
}
