import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Avatar } from "@/components/Avatar";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function EditProfileDialog({ open, onClose }: Props) {
  const { profile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && profile) {
      setDisplayName(profile.display_name ?? "");
      setAvatarUrl(profile.avatar_url ?? "");
    }
  }, [open, profile]);

  if (!profile) return null;

  const onSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({
          display_name: displayName.trim() || null,
          avatar_url: avatarUrl.trim() || null,
        })
        .eq("id", profile.id);
      if (error) throw error;
      await refreshProfile();
      toast.success("Profile updated");
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not save profile";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
        >
          <motion.div
            initial={{ y: 60, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-strong w-full max-w-md rounded-t-3xl p-6 shadow-soft sm:rounded-3xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold">Edit profile</h2>
              <button
                onClick={onClose}
                className="rounded-full glass p-2 hover:bg-white/10"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-5 flex items-center gap-4">
              <Avatar seed={profile.id} name={displayName || profile.username} size={64} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">@{profile.username}</p>
                <p className="text-[11px] text-muted-foreground">Username can&apos;t be changed</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block px-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                  Display name
                </label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={60}
                  placeholder="How you appear to others"
                  className="h-11 w-full rounded-2xl bg-input/60 px-4 text-sm outline-none placeholder:text-muted-foreground focus:bg-input focus:ring-2 focus:ring-ring/60"
                />
              </div>
              <div>
                <label className="mb-1 block px-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                  Avatar URL (optional)
                </label>
                <input
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://…"
                  className="h-11 w-full rounded-2xl bg-input/60 px-4 text-sm outline-none placeholder:text-muted-foreground focus:bg-input focus:ring-2 focus:ring-ring/60"
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.97 }}
              disabled={saving}
              onClick={onSave}
              className="mt-5 flex h-12 w-full items-center justify-center rounded-2xl gradient-primary text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
