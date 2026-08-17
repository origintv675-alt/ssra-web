-- Hide backend-only targeting data from the public Data API.
DROP POLICY IF EXISTS "Page locks are public" ON public.page_locks;
REVOKE SELECT ON public.page_locks FROM anon, authenticated;

DROP POLICY IF EXISTS "Popups are public" ON public.site_popups;
REVOKE SELECT ON public.site_popups FROM anon, authenticated;

-- Guest task history is returned through a narrow RPC instead of exposing every guest's rows.
DROP POLICY IF EXISTS "Guest task completions are readable" ON public.guest_task_completions;
REVOKE SELECT ON public.guest_task_completions FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.guest_task_ids(_guest_id uuid, _day date DEFAULT ((now() AT TIME ZONE 'utc')::date))
RETURNS TABLE(task_id text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT gtc.task_id
  FROM public.guest_task_completions gtc
  JOIN public.guests g ON g.id = gtc.guest_id
  WHERE gtc.guest_id = _guest_id
    AND gtc.day = _day
    AND NOT g.banned
$$;
REVOKE ALL ON FUNCTION public.guest_task_ids(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guest_task_ids(uuid, date) TO anon, authenticated, service_role;

-- Private chat media may only be opened by the uploader or a participant in the message that references it.
DROP POLICY IF EXISTS "Members read chat images" ON storage.objects;
DROP POLICY IF EXISTS "Members read chat media" ON storage.objects;
CREATE POLICY "Participants read chat images"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'community-media'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1
      FROM public.direct_messages dm
      WHERE dm.image_url = storage.objects.name
        AND (dm.sender_id = auth.uid() OR dm.recipient_id = auth.uid())
    )
  )
);

-- Notifications are system-generated; clients may read/update/delete only their own rows.
DROP POLICY IF EXISTS "Members create their notifications" ON public.notifications;
REVOKE INSERT ON public.notifications FROM authenticated;

CREATE OR REPLACE FUNCTION public.notify_friendship()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE requester_name text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT username INTO requester_name FROM public.profiles WHERE id = NEW.requester_id;
    INSERT INTO public.notifications (user_id, title, body, kind)
    VALUES (NEW.addressee_id, 'New friend request', coalesce(requester_name, 'A member') || ' sent you a friend request.', 'friend');
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'accepted' THEN
    SELECT username INTO requester_name FROM public.profiles WHERE id = NEW.addressee_id;
    INSERT INTO public.notifications (user_id, title, body, kind)
    VALUES (NEW.requester_id, 'Friend request accepted', coalesce(requester_name, 'A member') || ' accepted your friend request.', 'friend');
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS friendships_notify ON public.friendships;
CREATE TRIGGER friendships_notify
AFTER INSERT OR UPDATE OF status ON public.friendships
FOR EACH ROW EXECUTE FUNCTION public.notify_friendship();

-- Internal trigger functions are never directly callable by API roles.
REVOKE ALL ON FUNCTION public.notify_friendship() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_direct_message() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- These tables use polling/RPC paths; remove unnecessary live row broadcasts.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'direct_messages') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.direct_messages;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'lobby_messages') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.lobby_messages;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'site_popups') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.site_popups;
  END IF;
END $$;