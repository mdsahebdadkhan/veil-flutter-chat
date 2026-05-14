import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Users, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/_app/groups")({
  component: GroupsPage,
});

function GroupsPage() {
  return (
    <div className="relative flex min-h-screen flex-col">
      <header className="glass-strong sticky top-0 z-20 border-b border-border/50 px-5 py-4">
        <h1 className="text-lg font-bold">Groups</h1>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Private group conversations
        </p>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 pb-32">
        <EmptyState
          icon={Users}
          title="Groups are coming soon"
          description="Create rooms with friends and teams. Encryption-ready, just like 1:1 chats."
          action={
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-1.5 rounded-full glass px-3 py-1.5 text-[11px] text-muted-foreground"
            >
              <Sparkles className="h-3 w-3 text-primary" />
              In development
            </motion.div>
          }
        />
      </main>
    </div>
  );
}
