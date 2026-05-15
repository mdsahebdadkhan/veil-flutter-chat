import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { decryptMessage, encryptMessage } from "@/lib/encryption";
import { fetchProfiles, type ChatUser, type Message } from "@/lib/chat-hooks";

export interface Group {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type GroupRole = "admin" | "member";

export interface GroupMember {
  group_id: string;
  user_id: string;
  role: GroupRole;
  joined_at: string;
  profile?: ChatUser;
}

export interface GroupSummary {
  group: Group;
  memberCount: number;
  lastText: string | null;
  lastAt: string | null;
  unread: number;
}

/** Groups the current user belongs to, with last message preview. */
export function useUserGroups(currentUserId: string | undefined) {
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!currentUserId) return;

    const { data: memberships } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", currentUserId);

    const groupIds = (memberships ?? []).map((m) => m.group_id);
    if (groupIds.length === 0) {
      setGroups([]);
      setLoading(false);
      return;
    }

    const [{ data: groupRows }, { data: counts }, { data: lastMsgs }] = await Promise.all([
      supabase.from("groups").select("*").in("id", groupIds),
      supabase.from("group_members").select("group_id").in("group_id", groupIds),
      supabase
        .from("messages")
        .select("group_id, encrypted_message, created_at")
        .in("group_id", groupIds)
        .order("created_at", { ascending: false })
        .limit(500),
    ]);

    const countMap = new Map<string, number>();
    for (const row of counts ?? []) {
      countMap.set(row.group_id, (countMap.get(row.group_id) ?? 0) + 1);
    }

    const lastByGroup = new Map<string, { text: string; at: string }>();
    for (const m of lastMsgs ?? []) {
      if (!m.group_id || lastByGroup.has(m.group_id)) continue;
      lastByGroup.set(m.group_id, {
        text: await decryptMessage(m.encrypted_message),
        at: m.created_at,
      });
    }

    const summaries: GroupSummary[] = (groupRows ?? []).map((g) => {
      const last = lastByGroup.get(g.id);
      return {
        group: g as Group,
        memberCount: countMap.get(g.id) ?? 0,
        lastText: last?.text ?? null,
        lastAt: last?.at ?? null,
        unread: 0,
      };
    });

    summaries.sort((a, b) => {
      const at = a.lastAt ?? a.group.created_at;
      const bt = b.lastAt ?? b.group.created_at;
      return at < bt ? 1 : -1;
    });

    setGroups(summaries);
    setLoading(false);
  }, [currentUserId]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Realtime: refresh when group / membership / group message changes.
  useEffect(() => {
    if (!currentUserId) return;
    const channel = supabase
      .channel(`user-groups-${currentUserId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "group_members" },
        () => reload()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "groups" },
        () => reload()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const row = payload.new as { group_id: string | null };
          if (row.group_id) reload();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, reload]);

  return { groups, loading, reload };
}

/** Single group with members hydrated. */
export function useGroup(groupId: string | undefined) {
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!groupId) return;
    const [{ data: g }, { data: m }] = await Promise.all([
      supabase.from("groups").select("*").eq("id", groupId).maybeSingle(),
      supabase.from("group_members").select("*").eq("group_id", groupId),
    ]);
    setGroup((g as Group | null) ?? null);

    const memberRows = (m as Omit<GroupMember, "profile">[] | null) ?? [];
    const profiles = await fetchProfiles(memberRows.map((r) => r.user_id));
    const byId = new Map(profiles.map((p) => [p.id, p]));
    setMembers(memberRows.map((r) => ({ ...r, profile: byId.get(r.user_id) })));
    setLoading(false);
  }, [groupId]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (!groupId) return;
    const channel = supabase
      .channel(`group-${groupId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "group_members", filter: `group_id=eq.${groupId}` },
        () => reload()
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "groups", filter: `id=eq.${groupId}` },
        () => reload()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, reload]);

  return { group, members, loading, reload };
}

/** Live messages for a group thread. */
export function useGroupThread(currentUserId: string | undefined, groupId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("group_id", groupId)
        .order("created_at", { ascending: true });
      if (!active) return;
      const decoded = await Promise.all(
        (data ?? []).map(async (m) => ({ ...m, text: await decryptMessage(m.encrypted_message) }))
      );
      setMessages(decoded as Message[]);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [groupId]);

  useEffect(() => {
    if (!groupId) return;
    const channel = supabase
      .channel(`group-thread-${groupId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `group_id=eq.${groupId}` },
        async (payload) => {
          const row = payload.new as Omit<Message, "text">;
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
  }, [groupId]);

  const send = useCallback(
    async (text: string) => {
      if (!currentUserId || !groupId || !text.trim()) return;
      const ciphertext = await encryptMessage(text.trim());
      await supabase.from("messages").insert({
        sender_id: currentUserId,
        group_id: groupId,
        encrypted_message: ciphertext,
      });
    },
    [currentUserId, groupId]
  );

  return { messages, loading, send };
}

/** Create a group and add initial members. Creator becomes admin via trigger. */
export async function createGroup(input: {
  createdBy: string;
  name: string;
  description?: string | null;
  avatarUrl?: string | null;
  memberIds?: string[];
}): Promise<Group | null> {
  const { data: group, error } = await supabase
    .from("groups")
    .insert({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      avatar_url: input.avatarUrl ?? null,
      created_by: input.createdBy,
    })
    .select()
    .single();

  if (error || !group) return null;

  const extras = (input.memberIds ?? []).filter((id) => id !== input.createdBy);
  if (extras.length > 0) {
    await supabase.from("group_members").insert(
      extras.map((user_id) => ({ group_id: group.id, user_id, role: "member" as const }))
    );
  }
  return group as Group;
}

export async function leaveGroup(groupId: string, userId: string) {
  await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", userId);
}

export async function addGroupMembers(groupId: string, userIds: string[]) {
  if (userIds.length === 0) return;
  await supabase
    .from("group_members")
    .insert(userIds.map((user_id) => ({ group_id: groupId, user_id, role: "member" as const })));
}

export async function removeGroupMember(groupId: string, userId: string) {
  await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", userId);
}
