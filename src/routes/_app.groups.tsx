import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Users, X, Search, Check } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useUserGroups, createGroup } from "@/lib/group-hooks";
import { useDirectory } from "@/lib/chat-hooks";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { formatDistanceToNowStrict } from "date-fns";

export const Route = createFileRoute("/_app/groups")({
  component: GroupsPage,
});

function GroupsPage() {
  const { user } = useAuth();
  const { groups, loading, reload } = useUserGroups(user?.id);
  const [showCreate, setShowCreate] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query) return groups;
    const q = query.toLowerCase();
    return groups.filter((g) => g.group.name.toLowerCase().includes(q));
  }, [groups, query]);

  return (
    <div className="relative flex min-h-screen flex-col">
      <header className="glass-strong sticky top-0 z-20 border-b border-border/50 px-5 py-4">
        <h1 className="text-lg font-bold">Groups</h1>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Private rooms with friends and teams
        </p>
      </header>

      <div className="px-5 pt-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search groups…"
            className="h-11 w-full rounded-2xl bg-input/60 pl-11 pr-4 text-sm outline-none transition-all placeholder:text-muted-foreground focus:bg-input focus:ring-2 focus:ring-ring/60"
          />
        </div>
      </div>

      <main className="scrollbar-thin flex-1 overflow-y-auto px-3 pb-32 pt-3">
        {loading ? (
          <SkeletonList />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title={query ? "No matching groups" : "No groups yet"}
            description={
              query
                ? "Try a different name."
                : "Create a private room and invite people from your directory."
            }
            action={
              !query && (
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setShowCreate(true)}
                  className="rounded-full gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
                >
                  Create a group
                </motion.button>
              )
            }
          />
        ) : (
          <ul className="space-y-1.5">
            <AnimatePresence initial={false}>
              {filtered.map((g, i) => (
                <motion.li
                  key={g.group.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: Math.min(i * 0.025, 0.2), duration: 0.32, ease: "easeOut" }}
                  whileTap={{ scale: 0.985 }}
                >
                  <Link
                    to="/group/$groupId"
                    params={{ groupId: g.group.id }}
                    className="group flex items-center gap-3 rounded-2xl border border-transparent px-3 py-3 transition-all hover:border-white/10 hover:bg-white/[0.04]"
                  >
                    <Avatar seed={g.group.id} name={g.group.name} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold">{g.group.name}</span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {g.lastAt
                            ? formatDistanceToNowStrict(new Date(g.lastAt), { addSuffix: false })
                            : "new"}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center justify-between gap-2">
                        <p className="truncate text-xs text-muted-foreground">
                          {g.lastText ?? `${g.memberCount} member${g.memberCount === 1 ? "" : "s"}`}
                        </p>
                        <span className="ml-2 shrink-0 text-[10px] text-muted-foreground">
                          {g.memberCount} 👥
                        </span>
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
        onClick={() => setShowCreate(true)}
        className="fixed bottom-24 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full gradient-primary shadow-glow"
        aria-label="New group"
      >
        <Plus className="h-6 w-6 text-primary-foreground" />
      </motion.button>

      <CreateGroupSheet
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={reload}
      />
    </div>
  );
}

function SkeletonList() {
  return (
    <ul className="space-y-1.5 px-2">
      {[0, 1, 2, 3].map((i) => (
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

function CreateGroupSheet({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const { users } = useDirectory(user?.id, search);

  const reset = () => {
    setName("");
    setDescription("");
    setSearch("");
    setPicked(new Set());
  };

  const togglePick = (id: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submit = async () => {
    if (!user || !name.trim() || busy) return;
    setBusy(true);
    const g = await createGroup({
      createdBy: user.id,
      name,
      description,
      memberIds: Array.from(picked),
    });
    setBusy(false);
    if (g) {
      reset();
      onClose();
      onCreated();
    }
  };

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
              <h2 className="text-lg font-bold">New group</h2>
              <button onClick={onClose} className="rounded-full glass p-2 hover:bg-white/10">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Group name"
                maxLength={80}
                className="h-11 w-full rounded-2xl bg-input/60 px-4 text-sm outline-none placeholder:text-muted-foreground focus:bg-input focus:ring-2 focus:ring-ring/60"
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (optional)"
                rows={2}
                maxLength={500}
                className="scrollbar-thin w-full resize-none rounded-2xl bg-input/60 px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:bg-input focus:ring-2 focus:ring-ring/60"
              />
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Add members by username…"
                  className="h-11 w-full rounded-2xl bg-input/60 pl-11 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:bg-input focus:ring-2 focus:ring-ring/60"
                />
              </div>
            </div>

            <ul className="scrollbar-thin mt-3 max-h-[40vh] space-y-1 overflow-y-auto">
              {users.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {search ? "No matches." : "Start typing to find people."}
                </p>
              )}
              {users.map((u) => {
                const checked = picked.has(u.id);
                return (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => togglePick(u.id)}
                      className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-white/5"
                    >
                      <Avatar seed={u.id} name={u.display_name ?? u.username} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {u.display_name ?? u.username}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">@{u.username}</p>
                      </div>
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                          checked
                            ? "gradient-primary border-transparent"
                            : "border-border bg-transparent"
                        }`}
                      >
                        {checked && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {picked.size} member{picked.size === 1 ? "" : "s"} selected
              </span>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={submit}
                disabled={!name.trim() || busy}
                className="rounded-full gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-50"
              >
                {busy ? "Creating…" : "Create group"}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
