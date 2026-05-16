import { motion } from "framer-motion";
import { FileText, Download } from "lucide-react";
import { classifyMedia, type Message } from "@/lib/chat-hooks";
import { formatBytes } from "@/lib/media-upload";

interface Props {
  message: Message;
  mine: boolean;
}

/** Renders the media portion (image / video / file) of a message bubble. */
export function MediaBubble({ message, mine }: Props) {
  if (!message.media_url) return null;
  const kind = classifyMedia(message.media_type);

  if (kind === "image") {
    return (
      <motion.a
        href={message.media_url}
        target="_blank"
        rel="noreferrer"
        whileHover={{ scale: 1.01 }}
        className="block overflow-hidden rounded-2xl"
      >
        <img
          src={message.media_url}
          alt={message.media_name ?? "image"}
          loading="lazy"
          className="max-h-72 w-full max-w-[280px] object-cover"
        />
      </motion.a>
    );
  }

  if (kind === "video") {
    return (
      <video
        src={message.media_url}
        controls
        preload="metadata"
        className="max-h-72 w-full max-w-[280px] rounded-2xl bg-black"
      />
    );
  }

  return (
    <a
      href={message.media_url}
      target="_blank"
      rel="noreferrer"
      download={message.media_name ?? undefined}
      className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors ${
        mine ? "bg-white/10 hover:bg-white/15" : "bg-black/20 hover:bg-black/30"
      }`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary">
        <FileText className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-semibold">
          {message.media_name ?? "Attachment"}
        </span>
        <span className="block text-[10px] opacity-70">
          {message.media_size ? formatBytes(message.media_size) : ""}
        </span>
      </span>
      <Download className="h-4 w-4 opacity-60" />
    </a>
  );
}
