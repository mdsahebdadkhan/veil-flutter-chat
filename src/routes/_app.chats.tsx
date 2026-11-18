import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, ShieldCheck, MessageCircle, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useConversations, useDirectory } from "@/lib/chat-hooks";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { formatDistanceToNowStrict } from "date-fns";

export const Route = createFileRoute("/_app/chats")({
  component: ChatsPage,
});

function ChatsPage() {
  const { user, profile } = useAuth();
  const [showDirectory, setShowDirectory] = useState(false);
  const [query, setQuery] = useState("");
  const [directoryQuery, setDirectoryQuery] = useState("");

  const { conversations, loading: convLoading } = useConversations(user?.id);
  const { users } = useDirectory(user?.id, directoryQuery);

  const filtered = useMemo(() => {
    if (!query) return conversations;
    const q = query.toLowerCase();
    return conversations.filter(
      (c) =>
        c.peer.username.toLowerCase().includes(q) ||
        (c.peer.display_name?.toLowerCase().includes(q) ?? false),
    );
  }, [conversations, query]);

  return (
    <div className="relative flex min-h-screen flex-col">
      <header className="glass-strong sticky top-0 z-20 flex items-center justify-between border-b border-border/50 px-5 py-4">
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ scale: 1.05, rotate: 3 }}
            transition={{ type: "spring", stiffness: 320, damping: 20 }}
            className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary shadow-glow"
          >
            <ShieldCheck className="h-5 w-5 text-primary-foreground" />
          </motion.div>
          <div>
            <h1 className="text-lg font-bold text-gradient leading-none">Veil</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">@{profile?.username ?? "…"}</p>
          </div>
        </div>
      </header>

      <div className="px-5 pt-4">
        <SearchInput value={query} onChange={setQuery} placeholder="Search conversations…" />
      </div>

      <main className="scrollbar-thin flex-1 overflow-y-auto px-3 pb-32 pt-3">
        {convLoading ? (
          <SkeletonList />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="No conversations yet"
            description="Tap + to start your first private chat."
            action={
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setShowDirectory(true)}
                className="rounded-full gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
              >
                Start a chat
              </motion.button>
            }
          />
        ) : (
          <ul className="space-y-1.5">
            <AnimatePresence initial={false}>
              {filtered.map((c, i) => (
                <motion.li
                  key={c.peer.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: Math.min(i * 0.025, 0.2), duration: 0.32, ease: "easeOut" }}
                  whileTap={{ scale: 0.985 }}
                >
                  <Link
                    to="/chat/$peerId"
                    params={{ peerId: c.peer.id }}
                    className="group flex items-center gap-3 rounded-2xl border border-transparent px-3 py-3 transition-all hover:border-white/10 hover:bg-white/[0.04]"
                  >
                    <Avatar seed={c.peer.id} name={c.peer.display_name ?? c.peer.username} online />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold">
                          {c.peer.display_name ?? c.peer.username}
                        </span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {formatDistanceToNowStrict(new Date(c.lastAt), { addSuffix: false })}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center justify-between gap-2">
                        <p className="truncate text-xs text-muted-foreground">{c.lastText}</p>
                        {c.unread > 0 && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 400, damping: 18 }}
                            className="ml-2 flex h-5 min-w-[20px] items-center justify-center rounded-full gradient-primary px-1.5 text-[10px] font-bold text-primary-foreground shadow-glow"
                          >
                            {c.unread > 99 ? "99+" : c.unread}
                          </motion.span>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </main>

      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 22, delay: 0.15 }}
        whileHover={{ scale: 1.08, rotate: 8 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowDirectory(true)}
        className="fixed bottom-24 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full gradient-primary shadow-glow"
        aria-label="New chat"
      >
        <Plus className="h-6 w-6 text-primary-foreground" />
      </motion.button>

      <DirectorySheet
        open={showDirectory}
        onClose={() => setShowDirectory(false)}
        query={directoryQuery}
        onQuery={setDirectoryQuery}
        users={users}
      />
    </div>
  );
}

function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-2xl bg-input/60 pl-11 pr-10 text-sm outline-none transition-all placeholder:text-muted-foreground focus:bg-input focus:ring-2 focus:ring-ring/60"
      />
      <AnimatePresence>
        {value && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => onChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-white/10"
            aria-label="Clear"
          >
            <X className="h-3.5 w-3.5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

function SkeletonList() {
  return (
    <ul className="space-y-1.5 px-2">
      {[0, 1, 2, 3, 4].map((i) => (
        <li key={i} className="flex items-center gap-3 rounded-2xl px-3 py-3">
          <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-card/50" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 animate-pulse rounded bg-card/50" />
            <div className="h-2.5 w-2/3 animate-pulse rounded bg-card/40" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function DirectorySheet({
  open,
  onClose,
  query,
  onQuery,
  users,
}: {
  open: boolean;
  onClose: () => void;
  query: string;
  onQuery: (v: string) => void;
  users: Array<{ id: string; username: string; display_name: string | null }>;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-strong w-full max-w-lg rounded-t-3xl p-5 shadow-soft sm:rounded-3xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Start a conversation</h2>
              <button onClick={onClose} className="rounded-full glass p-2 hover:bg-white/10">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mb-3">
              <SearchInput value={query} onChange={onQuery} placeholder="Search by username…" />
            </div>
            <ul className="scrollbar-thin max-h-[55vh] space-y-1 overflow-y-auto">
              {users.length === 0 && (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  {query ? "No users match that name." : "No other users yet."}
                </p>
              )}
              {users.map((u, i) => (
                <motion.li
                  key={u.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.18) }}
                >
                  <Link
                    to="/chat/$peerId"
                    params={{ peerId: u.id }}
                    onClick={onClose}
                    className="flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-white/5"
                  >
                    <Avatar seed={u.id} name={u.display_name ?? u.username} online />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{u.display_name ?? u.username}</p>
                      <p className="truncate text-xs text-muted-foreground">@{u.username}</p>
                    </div>
                  </Link>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
