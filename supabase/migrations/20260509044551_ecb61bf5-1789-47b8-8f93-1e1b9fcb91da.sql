
-- 1. Add new identity columns
ALTER TABLE public.users
  ADD COLUMN username TEXT,
  ADD COLUMN display_name TEXT,
  ADD COLUMN avatar_url TEXT;

-- 2. Backfill usernames for any existing rows
UPDATE public.users
SET username = COALESCE(
  NULLIF(lower(regexp_replace(split_part(email, '@', 1), '[^a-z0-9_]', '', 'g')), ''),
  'user'
) || '_' || substr(id::text, 1, 6)
WHERE username IS NULL;

UPDATE public.users
SET display_name = username
WHERE display_name IS NULL;

-- 3. Constraints + indexes
ALTER TABLE public.users
  ALTER COLUMN username SET NOT NULL,
  ADD CONSTRAINT users_username_unique UNIQUE (username),
  ADD CONSTRAINT users_username_format CHECK (username ~ '^[a-z0-9_]{3,30}$');

CREATE INDEX idx_users_username ON public.users (username);

-- 4. Lock down RLS: only owner can read their own row (with email)
DROP POLICY IF EXISTS "Authenticated users can view directory" ON public.users;

CREATE POLICY "Users can view own row"
  ON public.users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- 5. Public, email-free profiles view (security definer view bypasses RLS but
--    only exposes non-sensitive columns)
CREATE OR REPLACE VIEW public.profiles AS
SELECT
  id,
  username,
  display_name,
  avatar_url,
  public_key,
  created_at
FROM public.users;

GRANT SELECT ON public.profiles TO authenticated;

-- 6. Username availability check, callable from signup form
CREATE OR REPLACE FUNCTION public.username_available(_username TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _username ~ '^[a-z0-9_]{3,30}$'
    AND NOT EXISTS (
      SELECT 1 FROM public.users WHERE username = lower(_username)
    );
$$;

GRANT EXECUTE ON FUNCTION public.username_available(TEXT) TO anon, authenticated;

-- 7. Updated signup trigger: seed username/display_name from auth metadata,
--    falling back to a safe auto-generated handle. Guarantees uniqueness.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uname  TEXT;
  base   TEXT;
  dname  TEXT;
  suffix INT := 0;
BEGIN
  uname := lower(coalesce(NEW.raw_user_meta_data->>'username', ''));
  IF uname = '' OR uname !~ '^[a-z0-9_]{3,30}$' THEN
    base := lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-z0-9_]', '', 'g'));
    IF base IS NULL OR length(base) < 3 THEN
      base := 'user';
    END IF;
    uname := base || '_' || substr(NEW.id::text, 1, 6);
  END IF;

  WHILE EXISTS (SELECT 1 FROM public.users WHERE username = uname) LOOP
    suffix := suffix + 1;
    uname := uname || suffix::text;
  END LOOP;

  dname := coalesce(NULLIF(NEW.raw_user_meta_data->>'display_name', ''), uname);

  INSERT INTO public.users (id, email, username, display_name)
  VALUES (NEW.id, NEW.email, uname, dname)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
