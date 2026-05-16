import { useEffect, useRef, useState, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Paperclip, Send, Smile, X, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { uploadChatMedia, formatBytes, MAX_MEDIA_BYTES } from "@/lib/media-upload";
import { classifyMedia, type SendAttachment } from "@/lib/chat-hooks";

const EmojiPicker = lazy(() => import("emoji-picker-react"));

interface Props {
  currentUserId: string;
  onSend: (text: string, attachment?: SendAttachment) => Promise<void>;
  onTyping?: () => void;
  placeholder?: string;
}

export function MessageComposer({ currentUserId, onSend, onTyping, placeholder = "Message…" }: Props) {
  const [draft, setDraft] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showEmoji, setShowEmoji] = useState(false);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > MAX_MEDIA_BYTES) {
      toast.error(`File is too large (max ${formatBytes(MAX_MEDIA_BYTES)}).`);
      return;
    }
    setFile(f);
  };

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (sending || uploading) return;
    const text = draft.trim();
    if (!text && !file) return;

    setSending(true);
    try {
      let attachment: SendAttachment | undefined;
      if (file) {
        setUploading(true);
        setProgress(0);
        attachment = await uploadChatMedia(currentUserId, file, setProgress);
        setUploading(false);
      }
      await onSend(text, attachment);
      setDraft("");
      setFile(null);
      setProgress(0);
      setShowEmoji(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to send";
      toast.error(msg);
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  const insertEmoji = (emoji: string) => {
    const ta = textareaRef.current;
    if (!ta) {
      setDraft((d) => d + emoji);
      return;
    }
    const start = ta.selectionStart ?? draft.length;
    const end = ta.selectionEnd ?? draft.length;
    const next = draft.slice(0, start) + emoji + draft.slice(end);
    setDraft(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + emoji.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  const filePreviewKind = file ? classifyMedia(file.type) : null;
  const canSend = (draft.trim().length > 0 || !!file) && !sending;

  return (
    <div className="z-20 px-3 pb-4 pt-2">
      {/* Attachment preview */}
      <AnimatePresence>
        {file && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="glass-strong mx-auto mb-2 flex max-w-2xl items-center gap-3 rounded-2xl p-2.5"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-black/30">
              {filePreviewKind === "image" && previewUrl ? (
                <img src={previewUrl} alt="" className="h-full w-full object-cover" />
              ) : filePreviewKind === "video" && previewUrl ? (
                <video src={previewUrl} className="h-full w-full object-cover" muted />
              ) : (
                <FileText className="h-5 w-5 text-primary" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">{file.name}</p>
              <p className="text-[10px] text-muted-foreground">{formatBytes(file.size)}</p>
              {uploading && (
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full gradient-primary transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setFile(null)}
              disabled={uploading}
              className="rounded-full glass p-2 hover:bg-white/10 disabled:opacity-50"
              aria-label="Remove attachment"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Emoji picker */}
      <AnimatePresence>
        {showEmoji && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            className="mx-auto mb-2 max-w-2xl overflow-hidden rounded-2xl"
          >
            <Suspense
              fallback={
                <div className="glass-strong flex h-64 items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              }
            >
              {/* @ts-expect-error - default export */}
              <EmojiPicker
                theme="dark"
                lazyLoadEmojis
                width="100%"
                height={320}
                onEmojiClick={(d: { emoji: string }) => insertEmoji(d.emoji)}
              />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>

      <form
        onSubmit={send}
        className="glass-strong mx-auto flex max-w-2xl items-end gap-1 rounded-3xl p-1.5 shadow-soft"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,application/pdf,application/zip,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/*"
          className="hidden"
          onChange={pickFile}
        />
        <motion.button
          type="button"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground disabled:opacity-50"
          aria-label="Attach file"
        >
          <Paperclip className="h-4 w-4" />
        </motion.button>

        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (e.target.value.trim()) onTyping?.();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder={placeholder}
          className="scrollbar-thin max-h-32 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground"
        />

        <motion.button
          type="button"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowEmoji((v) => !v)}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/5 ${
            showEmoji ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
          aria-label="Emoji"
        >
          <Smile className="h-4 w-4" />
        </motion.button>

        <motion.button
          type="submit"
          whileTap={{ scale: 0.88 }}
          whileHover={canSend ? { scale: 1.05 } : undefined}
          disabled={!canSend}
          animate={{ opacity: canSend ? 1 : 0.4, rotate: canSend ? 0 : -15 }}
          transition={{ type: "spring", stiffness: 320, damping: 20 }}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full gradient-primary shadow-glow"
          aria-label="Send"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary-foreground" />
          ) : (
            <Send className="h-4 w-4 text-primary-foreground" />
          )}
        </motion.button>
      </form>
    </div>
  );
}
