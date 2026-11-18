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

export type MediaKind = "image" | "video" | "file";

export interface MessageMedia {
  url: string;
  type: MediaKind;
  mime: string;
  name: string;
  size: number;
}

export interface Message {
  id: string;
  sender_id: string;
  /** null when the message belongs to a group thread. */
  receiver_id: string | null;
  /** null when the message is a 1:1 direct message. */
  group_id: string | null;
  encrypted_message: string;
  created_at: string;
  /** Decrypted in-memory only. Never persisted. */
  text: string;
  media_url: string | null;
  media_type: string | null;
  media_name: string | null;
  media_size: number | null;
}

export function classifyMedia(mime: string | null | undefined): MediaKind {
  if (!mime) return "file";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return "file";
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

/** Batch fetch profiles by id. */
export async function fetchProfiles(ids: string[]): Promise<ChatUser[]> {
  if (ids.length === 0) return [];
  const { data } = await supabase.from("profiles").select(PROFILE_COLUMNS).in("id", ids);
  return (data as ChatUser[] | null) ?? [];
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
      .is("group_id", null)
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
      if (!m.receiver_id) continue;
      const peer = m.sender_id === currentUserId ? m.receiver_id : m.sender_id;
      peerIds.add(peer);
      if (!latestByPeer.has(peer)) latestByPeer.set(peer, m);
    }

    if (peerIds.size === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const peers = await fetchProfiles(Array.from(peerIds));
    const byId = new Map<string, ChatUser>();
    for (const p of peers) byId.set(p.id, p);

    const result: ConversationSummary[] = [];
    for (const [peerId, last] of latestByPeer.entries()) {
      const peer = byId.get(peerId);
      if (!peer) continue;
      const lastAny = last as typeof last & {
        media_url?: string | null;
        media_type?: string | null;
      };
      let lastText: string;
      if (lastAny.media_url) {
        const kind = classifyMedia(lastAny.media_type);
        lastText = kind === "image" ? "📷 Photo" : kind === "video" ? "🎥 Video" : "📎 File";
      } else {
        lastText = await decryptMessage(last.encrypted_message);
      }
      result.push({
        peer,
        lastText,
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

  // Realtime: any new direct message touching me triggers a refresh.
  useEffect(() => {
    if (!currentUserId) return;
    const channel = supabase
      .channel(`conv-${currentUserId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const row = payload.new as {
            sender_id: string;
            receiver_id: string | null;
            group_id: string | null;
          };
          if (row.group_id) return;
          if (row.sender_id === currentUserId || row.receiver_id === currentUserId) {
            reload();
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, reload]);

  return { conversations, loading, reload };
}

export interface SendAttachment {
  url: string;
  mime: string;
  name: string;
  size: number;
}

export function decodeMessageRow(row: Record<string, unknown>): Message {
  return {
    id: row.id as string,
    sender_id: row.sender_id as string,
    receiver_id: (row.receiver_id as string | null) ?? null,
    group_id: (row.group_id as string | null) ?? null,
    encrypted_message: (row.encrypted_message as string) ?? "",
    created_at: row.created_at as string,
    text: "",
    media_url: (row.media_url as string | null) ?? null,
    media_type: (row.media_type as string | null) ?? null,
    media_name: (row.media_name as string | null) ?? null,
    media_size: (row.media_size as number | null) ?? null,
  };
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
        .is("group_id", null)
        .or(
          `and(sender_id.eq.${currentUserId},receiver_id.eq.${peerId}),and(sender_id.eq.${peerId},receiver_id.eq.${currentUserId})`,
        )
        .order("created_at", { ascending: true });
      if (!active) return;
      const decoded = await Promise.all(
        (data ?? []).map(async (m) => {
          const base = decodeMessageRow(m as Record<string, unknown>);
          return { ...base, text: await decryptMessage(base.encrypted_message) };
        }),
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
          const row = payload.new as Record<string, unknown>;
          if (row.group_id) return;
          const involves =
            (row.sender_id === currentUserId && row.receiver_id === peerId) ||
            (row.sender_id === peerId && row.receiver_id === currentUserId);
          if (!involves) return;
          const base = decodeMessageRow(row);
          setMessages((prev) => {
            if (prev.some((m) => m.id === base.id)) return prev;
            return [...prev, base];
          });
          const text = await decryptMessage(base.encrypted_message);
          setMessages((prev) => prev.map((m) => (m.id === base.id ? { ...m, text } : m)));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, peerId]);

  const send = useCallback(
    async (text: string, attachment?: SendAttachment) => {
      if (!currentUserId || !peerId) return;
      const trimmed = text.trim();
      if (!trimmed && !attachment) return;
      const ciphertext = trimmed ? await encryptMessage(trimmed) : "";
      const { error } = await supabase.from("messages").insert({
        sender_id: currentUserId,
        receiver_id: peerId,
        encrypted_message: ciphertext,
        media_url: attachment?.url ?? null,
        media_type: attachment?.mime ?? null,
        media_name: attachment?.name ?? null,
        media_size: attachment?.size ?? null,
      });
      if (error) throw error;
    },
    [currentUserId, peerId],
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
