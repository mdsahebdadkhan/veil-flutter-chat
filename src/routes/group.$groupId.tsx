import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, Users as UsersIcon, LogOut, X, UserMinus } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useGroup, useGroupThread, leaveGroup, removeGroupMember } from "@/lib/group-hooks";
import { Avatar } from "@/components/Avatar";
import { AuroraBackground } from "@/components/AuroraBackground";
import { TypingIndicator } from "@/components/TypingIndicator";
import { supabase } from "@/integrations/supabase/client";
import { format, isToday, isYesterday } from "date-fns";

interface TypingPayload {
  userId: string;
  name: string;
  at: number;
}

export const Route = createFileRoute("/group/$groupId")({
  component: GroupChatPage,
});

function GroupChatPage() {
  const { groupId } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { group, members } = useGroup(groupId);
  const { messages, send } = useGroupThread(user?.id, groupId);
  const [draft, setDraft] = useState("");
  const [showInfo, setShowInfo] = useState(false);
  const [typing, setTyping] = useState<TypingPayload[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastTypingSentRef = useRef(0);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, typing.length]);

  const memberById = useMemo(() => {
    const map = new Map<string, (typeof members)[number]>();
    for (const m of members) map.set(m.user_id, m);
    return map;
  }, [members]);

  const me = user ? memberById.get(user.id)?.profile : undefined;
  const myName = me?.display_name ?? me?.username ?? "Someone";

  // Typing presence via Supabase broadcast.
  useEffect(() => {
    if (!user || !groupId) return;
    const channel = supabase.channel(`typing:group:${groupId}`, {
      config: { broadcast: { self: false } },
    });
    channel
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const p = payload as TypingPayload;
        if (!p?.userId || p.userId === user.id) return;
        setTyping((prev) => {
          const next = prev.filter((t) => t.userId !== p.userId);
          next.push({ ...p, at: Date.now() });
          return next;
        });
      })
      .subscribe();
    typingChannelRef.current = channel;
    const interval = window.setInterval(() => {
      setTyping((prev) => prev.filter((t) => Date.now() - t.at < 3500));
    }, 1000);
    return () => {
      window.clearInterval(interval);
      supabase.removeChannel(channel);
      typingChannelRef.current = null;
    };
  }, [user, groupId]);

  const broadcastTyping = useCallback(() => {
    if (!user) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current < 1200) return;
    lastTypingSentRef.current = now;
    typingChannelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { userId: user.id, name: myName, at: now } satisfies TypingPayload,
    });
  }, [user, myName]);

  const onSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    await send(text);
  };

  const onLeave = async () => {
    if (!user) return;
    await leaveGroup(groupId, user.id);
    navigate({ to: "/groups" });
  };

  if (!user) return null;

  return (
    <div className="relative flex h-screen flex-col">
      <AuroraBackground />

      <header className="glass-strong z-20 flex items-center gap-3 border-b border-border/50 px-4 py-3">
        <Link to="/groups" className="rounded-full glass p-2 hover:bg-white/10 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        {group && <Avatar seed={group.id} name={group.name} size={38} />}
        <button
          onClick={() => setShowInfo(true)}
          className="min-w-0 flex-1 text-left"
        >
          <p className="truncate text-sm font-semibold">{group?.name ?? "…"}</p>
          <p className="text-[11px] text-muted-foreground">
            {members.length} member{members.length === 1 ? "" : "s"}
          </p>
        </button>
        <button
          onClick={() => setShowInfo(true)}
          className="rounded-full glass p-2 hover:bg-white/10"
          aria-label="Group info"
        >
          <UsersIcon className="h-4 w-4" />
        </button>
      </header>

      <div ref={scrollRef} className="scrollbar-thin flex-1 overflow-y-auto px-3 py-4">
        <div className="mx-auto flex max-w-2xl flex-col gap-1">
          <AnimatePresence initial={false}>
            {messages.map((m, i) => {
              const mine = m.sender_id === user.id;
              const prev = messages[i - 1];
              const showDate =
                !prev ||
                new Date(m.created_at).toDateString() !== new Date(prev.created_at).toDateString();
              const grouped = prev && prev.sender_id === m.sender_id && !showDate;
              const sender = memberById.get(m.sender_id)?.profile;
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
                    className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"} ${
                      grouped ? "mt-0.5" : "mt-2"
                    }`}
                  >
                    {!mine && !grouped && sender && (
                      <Avatar seed={sender.id} name={sender.display_name ?? sender.username} size={28} />
                    )}
                    {!mine && grouped && <div style={{ width: 28 }} />}
                    <div
                      className={`max-w-[78%] px-4 py-2.5 text-sm leading-relaxed shadow-bubble ${
                        mine
                          ? "rounded-2xl rounded-br-md text-bubble-me-foreground"
                          : "rounded-2xl rounded-bl-md bg-bubble-them text-bubble-them-foreground"
                      }`}
                      style={mine ? { background: "var(--gradient-bubble-me)" } : undefined}
                    >
                      {!mine && !grouped && sender && (
                        <p className="mb-0.5 text-[11px] font-semibold text-primary">
                          {sender.display_name ?? sender.username}
                        </p>
                      )}
                      <p className="whitespace-pre-wrap break-words">{m.text || "…"}</p>
                      <span
                        className={`mt-1 block text-[10px] ${
                          mine ? "text-white/70" : "text-muted-foreground"
                        } text-right`}
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
            {typing.map((t) => (
              <TypingIndicator key={t.userId} label={t.name} />
            ))}
          </AnimatePresence>

          {messages.length === 0 && typing.length === 0 && (
            <div className="mt-20 text-center text-sm text-muted-foreground">
              <p>No messages in {group?.name ?? "this group"} yet.</p>
              <p className="mt-1 text-[11px]">Say hi to get the conversation started.</p>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={onSend} className="z-20 px-3 pb-4 pt-2">
        <div className="glass-strong mx-auto flex max-w-2xl items-end gap-1 rounded-3xl p-1.5 shadow-soft">
          <textarea
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              if (e.target.value.trim()) broadcastTyping();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend(e as unknown as React.FormEvent);
              }
            }}
            rows={1}
            placeholder="Message group…"
            className="scrollbar-thin max-h-32 min-h-[40px] flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
          />
          <motion.button
            type="submit"
            whileTap={{ scale: 0.88 }}
            whileHover={{ scale: 1.05 }}
            disabled={!draft.trim()}
            animate={{ opacity: draft.trim() ? 1 : 0.4, rotate: draft.trim() ? 0 : -15 }}
            transition={{ type: "spring", stiffness: 320, damping: 20 }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full gradient-primary shadow-glow"
            aria-label="Send"
          >
            <Send className="h-4 w-4 text-primary-foreground" />
          </motion.button>
        </div>
      </form>

      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
            onClick={() => setShowInfo(false)}
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
                <h2 className="text-lg font-bold">{group?.name ?? "Group"}</h2>
                <button
                  onClick={() => setShowInfo(false)}
                  className="rounded-full glass p-2 hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {group?.description && (
                <p className="mb-4 text-sm text-muted-foreground">{group.description}</p>
              )}
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Members ({members.length})
              </h3>
              <ul className="scrollbar-thin max-h-[45vh] space-y-1 overflow-y-auto">
                {members.map((m) => (
                  <li
                    key={m.user_id}
                    className="flex items-center gap-3 rounded-2xl px-2 py-2"
                  >
                    {m.profile && (
                      <Avatar
                        seed={m.profile.id}
                        name={m.profile.display_name ?? m.profile.username}
                        size={36}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {m.profile?.display_name ?? m.profile?.username ?? "Unknown"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        @{m.profile?.username ?? "—"}
                      </p>
                    </div>
                    {m.role === "admin" && (
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                        Admin
                      </span>
                    )}
                  </li>
                ))}
              </ul>

              <button
                onClick={onLeave}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/20"
              >
                <LogOut className="h-4 w-4" />
                Leave group
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function dateLabel(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d, yyyy");
}
