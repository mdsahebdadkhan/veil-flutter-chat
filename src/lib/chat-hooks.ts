import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { decryptMessage, encryptMessage } from "@/lib/encryption";

/**
 * Public profile shape — NEVER contains email or any PII.
 * Backed by the `profiles` view (security invoker) which excludes email.
 */
export interface ChatUser {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  public_key: string | null;
}

const PROFILE_COLUMNS = "id, username, display_name, avatar_url, public_key" as const;

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  encrypted_message: string;
  created_at: string;
  /** Decrypted in-memory only. Never persisted. */
  text: string;
}

/** Fetch a single public profile by id. */
export async function fetchProfile(id: string): Promise<ChatUser | null> {
  const { data } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  return (data as ChatUser | null) ?? null;
}

/** All other users in the directory, optionally filtered by username search. */
export function useDirectory(currentUserId: string | undefined, search = "") {
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUserId) return;
    let active = true;
    (async () => {
      let query = supabase
        .from("profiles")
        .select(PROFILE_COLUMNS)
        .neq("id", currentUserId)
        .order("created_at", { ascending: false })
        .limit(100);
      const term = search.trim().toLowerCase();
      if (term) {
        query = query.or(`username.ilike.%${term}%,display_name.ilike.%${term}%`);
      }
      const { data } = await query;
      if (active) {
        setUsers((data as ChatUser[] | null) ?? []);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [currentUserId, search]);

  return { users, loading };
}

/** Conversation summaries built from the user's messages. */
export interface ConversationSummary {
  peer: ChatUser;
  lastText: string;
  lastAt: string;
  unread: number;
}

export function useConversations(currentUserId: string | undefined) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!currentUserId) return;
    const { data: msgs } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
      .order("created_at", { ascending: false })
      .limit(500);

    if (!msgs) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const peerIds = new Set<string>();
    const latestByPeer = new Map<string, (typeof msgs)[number]>();
    for (const m of msgs) {
      const peer = m.sender_id === currentUserId ? m.receiver_id : m.sender_id;
      peerIds.add(peer);
      if (!latestByPeer.has(peer)) latestByPeer.set(peer, m);
    }

    if (peerIds.size === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const { data: peers } = await supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .in("id", Array.from(peerIds));

    const byId = new Map<string, ChatUser>();
    for (const p of (peers as ChatUser[] | null) ?? []) byId.set(p.id, p);

    const result: ConversationSummary[] = [];
    for (const [peerId, last] of latestByPeer.entries()) {
      const peer = byId.get(peerId);
      if (!peer) continue;
      result.push({
        peer,
        lastText: await decryptMessage(last.encrypted_message),
        lastAt: last.created_at,
        unread: 0,
      });
    }
    result.sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1));
    setConversations(result);
    setLoading(false);
  }, [currentUserId]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Realtime: any new message touching me triggers a refresh.
  useEffect(() => {
    if (!currentUserId) return;
    const channel = supabase
      .channel(`conv-${currentUserId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const row = payload.new as { sender_id: string; receiver_id: string };
          if (row.sender_id === currentUserId || row.receiver_id === currentUserId) {
            reload();
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, reload]);

  return { conversations, loading, reload };
}

/** Live messages between current user and a peer. */
export function useThread(currentUserId: string | undefined, peerId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUserId || !peerId) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${currentUserId},receiver_id.eq.${peerId}),and(sender_id.eq.${peerId},receiver_id.eq.${currentUserId})`
        )
        .order("created_at", { ascending: true });
      if (!active) return;
      const decoded = await Promise.all(
        (data ?? []).map(async (m) => ({ ...m, text: await decryptMessage(m.encrypted_message) }))
      );
      setMessages(decoded);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [currentUserId, peerId]);

  useEffect(() => {
    if (!currentUserId || !peerId) return;
    const channel = supabase
      .channel(`thread-${currentUserId}-${peerId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const row = payload.new as Omit<Message, "text">;
          const involves =
            (row.sender_id === currentUserId && row.receiver_id === peerId) ||
            (row.sender_id === peerId && row.receiver_id === currentUserId);
          if (!involves) return;
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, { ...row, text: "" }];
          });
          const text = await decryptMessage(row.encrypted_message);
          setMessages((prev) => prev.map((m) => (m.id === row.id ? { ...m, text } : m)));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, peerId]);

  const send = useCallback(
    async (text: string) => {
      if (!currentUserId || !peerId || !text.trim()) return;
      const ciphertext = await encryptMessage(text.trim());
      await supabase.from("messages").insert({
        sender_id: currentUserId,
        receiver_id: peerId,
        encrypted_message: ciphertext,
      });
    },
    [currentUserId, peerId]
  );

  return { messages, loading, send };
}

/** Username availability check via the `username_available` SQL function. */
export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const normalized = username.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,30}$/.test(normalized)) return false;
  const { data, error } = await supabase.rpc("username_available", { _username: normalized });
  if (error) return false;
  return Boolean(data);
}
