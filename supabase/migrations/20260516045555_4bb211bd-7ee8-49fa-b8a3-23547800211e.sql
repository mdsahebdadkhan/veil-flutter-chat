
-- 1. Restore EXECUTE for authenticated users on RLS helper functions
GRANT EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_admin(uuid, uuid) TO authenticated;

-- 2. Add media columns to messages and relax encrypted_message
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS media_url text,
  ADD COLUMN IF NOT EXISTS media_type text,
  ADD COLUMN IF NOT EXISTS media_name text,
  ADD COLUMN IF NOT EXISTS media_size integer;

ALTER TABLE public.messages
  ALTER COLUMN encrypted_message SET DEFAULT '';

-- Require either text content or media
ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_content_check;
ALTER TABLE public.messages
  ADD CONSTRAINT messages_content_check
  CHECK (length(coalesce(encrypted_message, '')) > 0 OR media_url IS NOT NULL);

-- 3. Storage bucket for chat media
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: scoped to user folder for writes; public read so <img>/<video> work directly
DROP POLICY IF EXISTS "chat-media read" ON storage.objects;
CREATE POLICY "chat-media read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chat-media');

DROP POLICY IF EXISTS "chat-media upload own" ON storage.objects;
CREATE POLICY "chat-media upload own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chat-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "chat-media delete own" ON storage.objects;
CREATE POLICY "chat-media delete own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'chat-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
