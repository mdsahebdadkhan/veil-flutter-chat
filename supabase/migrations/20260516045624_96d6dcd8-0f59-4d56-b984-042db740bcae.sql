
DROP POLICY IF EXISTS "chat-media read" ON storage.objects;
-- Public bucket: direct URLs still work; this policy blocks the LIST endpoint.
CREATE POLICY "chat-media no list"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chat-media' AND false);
