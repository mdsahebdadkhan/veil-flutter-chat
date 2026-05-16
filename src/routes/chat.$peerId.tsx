import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useThread, type ChatUser } from "@/lib/chat-hooks";
import { Avatar } from "@/components/Avatar";
import { AuroraBackground } from "@/components/AuroraBackground";
import { MessageComposer } from "@/components/MessageComposer";
import { MediaBubble } from "@/components/MediaBubble";
import { format, isToday, isYesterday } from "date-fns";

export const Route = createFileRoute("/chat/$peerId")({
  component: ChatPage,
});

function ChatPage() {
  const { peerId } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [peer, setPeer] = useState<ChatUser | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, public_key")
        .eq("id", peerId)
        .maybeSingle();
      setPeer((data as ChatUser | null) ?? null);
    })();
  }, [peerId]);

  const { messages, send } = useThread(user?.id, peerId);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  if (!user) return null;

  return (
    <div className="relative flex h-screen flex-col">
      <AuroraBackground />

      <header className="glass-strong z-20 flex items-center gap-3 border-b border-border/50 px-4 py-3">
        <Link to="/chats" className="rounded-full glass p-2 hover:bg-white/10 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        {peer && <Avatar seed={peer.id} name={peer.display_name ?? peer.username} size={38} online />}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{peer?.display_name ?? peer?.username ?? "…"}</p>
          <p className="text-[11px] text-muted-foreground">@{peer?.username ?? ""}</p>
        </div>
      </header>

      <div ref={scrollRef} className="scrollbar-thin flex-1 overflow-y-auto px-3 py-4">
        <div className="mx-auto flex max-w-2xl flex-col gap-1">
          <AnimatePresence initial={false}>
            {messages.map((m, i) => {
              const mine = m.sender_id === user.id;
              const prev = messages[i - 1];
              const showDate =
                !prev || new Date(m.created_at).toDateString() !== new Date(prev.created_at).toDateString();
              const grouped = prev && prev.sender_id === m.sender_id && !showDate;
              return (
                <div key={m.id}>
                  {showDate && (
                    <div className="my-3 flex justify-center">
                      <span className="rounded-full glass px-3 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                        {dateLabel(m.created_at)}
                      </span>
                    </div>
                  )}
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 320, damping: 26 }}
                    className={`flex ${mine ? "justify-end" : "justify-start"} ${grouped ? "mt-0.5" : "mt-2"}`}
                  >
                    <div
                      className={`max-w-[78%] space-y-1.5 px-3 py-2 text-sm leading-relaxed shadow-bubble ${
                        mine
                          ? "rounded-2xl rounded-br-md text-bubble-me-foreground"
                          : "rounded-2xl rounded-bl-md bg-bubble-them text-bubble-them-foreground"
                      }`}
                      style={mine ? { background: "var(--gradient-bubble-me)" } : undefined}
                    >
                      {m.media_url && <MediaBubble message={m} mine={mine} />}
                      {m.text && (
                        <p className="whitespace-pre-wrap break-words px-1">{m.text}</p>
                      )}
                      <span
                        className={`block text-[10px] ${mine ? "text-white/70" : "text-muted-foreground"} text-right`}
                      >
                        {format(new Date(m.created_at), "HH:mm")}
                      </span>
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </AnimatePresence>

          {messages.length === 0 && (
            <div className="mt-20 text-center text-sm text-muted-foreground">
              <p>This is the beginning of your conversation with {peer?.display_name ?? peer?.username ?? "this user"}.</p>
              <p className="mt-1 text-[11px]">Messages are stored encryption-ready.</p>
            </div>
          )}
        </div>
      </div>

      <MessageComposer currentUserId={user.id} onSend={send} />
    </div>
  );
}

function dateLabel(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d, yyyy");
}
