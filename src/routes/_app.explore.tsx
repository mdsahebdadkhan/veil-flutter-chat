import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Compass, Search } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useDirectory } from "@/lib/chat-hooks";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/_app/explore")({
  component: ExplorePage,
});

function ExplorePage() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const { users, loading } = useDirectory(user?.id, query);

  return (
    <div className="relative flex min-h-screen flex-col">
      <header className="glass-strong sticky top-0 z-20 border-b border-border/50 px-5 py-4">
        <h1 className="text-lg font-bold">Explore</h1>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Discover people on Veil
        </p>
      </header>

      <div className="px-5 pt-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by username…"
            className="h-11 w-full rounded-2xl bg-input/60 pl-11 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:bg-input focus:ring-2 focus:ring-ring/60"
          />
        </div>
      </div>

      <main className="scrollbar-thin flex-1 overflow-y-auto px-3 pb-32 pt-3">
        {loading ? (
          <ul className="grid grid-cols-2 gap-2 px-2 sm:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <li
                key={i}
                className="h-32 animate-pulse rounded-2xl bg-card/40"
              />
            ))}
          </ul>
        ) : users.length === 0 ? (
          <EmptyState
            icon={Compass}
            title="No one to explore yet"
            description={
              query
                ? "Try a different username."
                : "When others join Veil they'll show up here."
            }
          />
        ) : (
          <ul className="grid grid-cols-2 gap-2 px-2 sm:grid-cols-3">
            {users.map((u, i) => (
              <motion.li
                key={u.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.2), duration: 0.32 }}
              >
                <Link
                  to="/chat/$peerId"
                  params={{ peerId: u.id }}
                  className="group flex h-full flex-col items-center gap-2 rounded-2xl border border-white/[0.06] bg-card/40 p-4 text-center transition-all hover:border-white/15 hover:bg-card/70"
                >
                  <Avatar seed={u.id} name={u.display_name ?? u.username} size={56} online />
                  <div className="min-w-0 max-w-full">
                    <p className="truncate text-sm font-semibold">
                      {u.display_name ?? u.username}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      @{u.username}
                    </p>
                  </div>
                </Link>
              </motion.li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
