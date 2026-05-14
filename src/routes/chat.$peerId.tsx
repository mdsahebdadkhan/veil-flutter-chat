import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Paperclip, Send, Smile } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useThread, type ChatUser } from "@/lib/chat-hooks";
import { Avatar } from "@/components/Avatar";
import { AuroraBackground } from "@/components/AuroraBackground";
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
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  // Local UI-only typing simulation: shows when peer is "active" (other end recently sent).
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || last.sender_id === user?.id) {
      setTyping(false);
      return;
    }
  }, [messages, user?.id]);

  const onSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    await send(text);
  };

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
                      className={`max-w-[78%] px-4 py-2.5 text-sm leading-relaxed shadow-bubble ${
                        mine
                          ? "rounded-2xl rounded-br-md text-bubble-me-foreground"
                          : "rounded-2xl rounded-bl-md bg-bubble-them text-bubble-them-foreground"
                      }`}
                      style={
                        mine
                          ? { background: "var(--gradient-bubble-me)" }
                          : undefined
                      }
                    >
                      <p className="whitespace-pre-wrap break-words">{m.text || "…"}</p>
                      <span
                        className={`mt-1 block text-[10px] ${mine ? "text-white/70" : "text-muted-foreground"} text-right`}
                      >
                        {format(new Date(m.created_at), "HH:mm")}
                      </span>
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </AnimatePresence>

          <AnimatePresence>
            {typing && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-2 flex justify-start"
              >
                <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-bubble-them px-4 py-3 shadow-bubble">
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {messages.length === 0 && (
            <div className="mt-20 text-center text-sm text-muted-foreground">
              <p>This is the beginning of your conversation with {peer?.display_name ?? peer?.username ?? "this user"}.</p>
              <p className="mt-1 text-[11px]">Messages are stored encryption-ready.</p>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={onSend} className="z-20 px-3 pb-4 pt-2">
        <div className="glass-strong mx-auto flex max-w-2xl items-end gap-2 rounded-3xl p-2 shadow-soft">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend(e as unknown as React.FormEvent);
              }
            }}
            rows={1}
            placeholder="Message…"
            className="scrollbar-thin max-h-32 min-h-[40px] flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
          />
          <motion.button
            type="submit"
            whileTap={{ scale: 0.88 }}
            whileHover={{ scale: 1.05 }}
            disabled={!draft.trim()}
            animate={{
              opacity: draft.trim() ? 1 : 0.4,
              rotate: draft.trim() ? 0 : -15,
            }}
            transition={{ type: "spring", stiffness: 320, damping: 20 }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full gradient-primary shadow-glow"
            aria-label="Send"
          >
            <Send className="h-4 w-4 text-primary-foreground" />
          </motion.button>
        </div>
      </form>
    </div>
  );
}

function dateLabel(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d, yyyy");
}
