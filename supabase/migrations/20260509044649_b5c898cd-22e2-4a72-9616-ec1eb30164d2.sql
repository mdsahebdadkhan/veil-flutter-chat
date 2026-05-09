
-- 1. Recreate profiles view as security invoker (RLS of caller applies)
DROP VIEW IF EXISTS public.profiles;
CREATE VIEW public.profiles
WITH (security_invoker = on) AS
SELECT id, username, display_name, avatar_url, public_key, created_at
FROM public.users;

GRANT SELECT ON public.profiles TO authenticated, anon;

-- 2. Replace owner-only SELECT policy with broad SELECT, but rely on
--    column-level grants to keep email unreachable through the API.
DROP POLICY IF EXISTS "Users can view own row" ON public.users;

CREATE POLICY "Authenticated can view safe profile columns"
  ON public.users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anon can check username uniqueness"
  ON public.users FOR SELECT
  TO anon
  USING (true);

-- 3. Column-level lockdown: revoke blanket SELECT, grant only safe columns
REVOKE SELECT ON public.users FROM authenticated, anon;

GRANT SELECT (id, username, display_name, avatar_url, public_key, created_at)
  ON public.users TO authenticated;

GRANT SELECT (username) ON public.users TO anon;

-- 4. Switch username_available to SECURITY INVOKER (no longer privilege-escalating)
CREATE OR REPLACE FUNCTION public.username_available(_username TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    _username ~ '^[a-z0-9_]{3,30}$'
    AND NOT EXISTS (
      SELECT 1 FROM public.users WHERE username = lower(_username)
    );
$$;
