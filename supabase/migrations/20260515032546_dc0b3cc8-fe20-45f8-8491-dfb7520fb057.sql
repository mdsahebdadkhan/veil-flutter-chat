
-- Role enum for group membership
CREATE TYPE public.group_role AS ENUM ('admin', 'member');

-- Groups
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 80),
  description TEXT CHECK (description IS NULL OR length(description) <= 500),
  avatar_url TEXT,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Group members
CREATE TABLE public.group_members (
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role public.group_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

CREATE INDEX idx_group_members_user ON public.group_members(user_id);
CREATE INDEX idx_group_members_group ON public.group_members(group_id);

-- Extend messages: support group messages
ALTER TABLE public.messages
  ADD COLUMN group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  ALTER COLUMN receiver_id DROP NOT NULL,
  ADD CONSTRAINT messages_target_check
    CHECK (
      (receiver_id IS NOT NULL AND group_id IS NULL)
      OR (receiver_id IS NULL AND group_id IS NOT NULL)
    );

CREATE INDEX idx_messages_group_created ON public.messages(group_id, created_at DESC)
  WHERE group_id IS NOT NULL;

-- Security definer membership helpers (avoid RLS recursion on group_members)
CREATE OR REPLACE FUNCTION public.is_group_member(_group_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = _group_id AND user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_group_admin(_group_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = _group_id AND user_id = _user_id AND role = 'admin'
  );
$$;

-- Auto-add creator as admin
CREATE OR REPLACE FUNCTION public.handle_new_group()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_group_created
  AFTER INSERT ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_group();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER groups_touch_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RLS
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- groups policies
CREATE POLICY "Members can view their groups"
  ON public.groups FOR SELECT
  TO authenticated
  USING (public.is_group_member(id, auth.uid()));

CREATE POLICY "Authenticated users can create groups"
  ON public.groups FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can update group"
  ON public.groups FOR UPDATE
  TO authenticated
  USING (public.is_group_admin(id, auth.uid()));

CREATE POLICY "Admins can delete group"
  ON public.groups FOR DELETE
  TO authenticated
  USING (public.is_group_admin(id, auth.uid()));

-- group_members policies
CREATE POLICY "Members can view memberships of their groups"
  ON public.group_members FOR SELECT
  TO authenticated
  USING (public.is_group_member(group_id, auth.uid()));

CREATE POLICY "Admins can add members"
  ON public.group_members FOR INSERT
  TO authenticated
  WITH CHECK (public.is_group_admin(group_id, auth.uid()));

CREATE POLICY "Admins can remove members or self can leave"
  ON public.group_members FOR DELETE
  TO authenticated
  USING (
    public.is_group_admin(group_id, auth.uid())
    OR user_id = auth.uid()
  );

CREATE POLICY "Admins can change roles"
  ON public.group_members FOR UPDATE
  TO authenticated
  USING (public.is_group_admin(group_id, auth.uid()))
  WITH CHECK (public.is_group_admin(group_id, auth.uid()));

-- Replace messages SELECT/INSERT policies to support groups
DROP POLICY IF EXISTS "Participants can read their messages" ON public.messages;
DROP POLICY IF EXISTS "Sender can insert own messages" ON public.messages;

CREATE POLICY "Participants or group members can read messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    (group_id IS NULL AND (auth.uid() = sender_id OR auth.uid() = receiver_id))
    OR (group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid()))
  );

CREATE POLICY "Sender can insert direct or group messages"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND (
      (group_id IS NULL AND receiver_id IS NOT NULL)
      OR (group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid()))
    )
  );

-- Realtime
ALTER TABLE public.groups REPLICA IDENTITY FULL;
ALTER TABLE public.group_members REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.groups;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
