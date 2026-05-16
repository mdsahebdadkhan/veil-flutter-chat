import { supabase } from "@/integrations/supabase/client";
import type { SendAttachment } from "@/lib/chat-hooks";

export const MAX_MEDIA_BYTES = 25 * 1024 * 1024; // 25 MB

export async function uploadChatMedia(
  userId: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<SendAttachment> {
  if (file.size > MAX_MEDIA_BYTES) {
    throw new Error("File is larger than 25 MB.");
  }
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "";
  const path = `${userId}/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;

  // supabase-js v2 doesn't expose upload progress over fetch; emulate to 95%
  // so the UI feels responsive, then snap to 100% on completion.
  onProgress?.(5);
  const fakeTimer = setInterval(() => {
    onProgress?.(Math.min(90, 5 + Math.random() * 85));
  }, 250);

  try {
    const { error } = await supabase.storage
      .from("chat-media")
      .upload(path, file, {
        cacheControl: "3600",
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
    if (error) throw error;
  } finally {
    clearInterval(fakeTimer);
  }

  const { data } = supabase.storage.from("chat-media").getPublicUrl(path);
  onProgress?.(100);

  return {
    url: data.publicUrl,
    mime: file.type || "application/octet-stream",
    name: file.name,
    size: file.size,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
