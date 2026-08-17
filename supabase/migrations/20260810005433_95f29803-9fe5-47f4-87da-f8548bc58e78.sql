CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT friendships_status_check CHECK (status IN ('pending','accepted','blocked')),
  CONSTRAINT friendships_not_self CHECK (requester_id <> addressee_id),
  CONSTRAINT friendships_unique_pair UNIQUE (requester_id, addressee_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.friendships TO authenticated;
GRANT ALL ON public.friendships TO service_role;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read their own friendships" ON public.friendships FOR SELECT TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "Members send friend requests" ON public.friendships FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Members update their own friendships" ON public.friendships FOR UPDATE TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id)
  WITH CHECK (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "Members remove their own friendships" ON public.friendships FOR DELETE TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE TRIGGER friendships_set_updated_at BEFORE UPDATE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  kind text NOT NULL DEFAULT 'system',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read their notifications" ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Members create their notifications" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Members update their notifications" ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Members delete their notifications" ON public.notifications FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
CREATE INDEX notifications_user_created_idx ON public.notifications (user_id, created_at DESC);

CREATE TABLE public.site_counters (
  key text PRIMARY KEY,
  value bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_counters TO anon, authenticated;
GRANT ALL ON public.site_counters TO service_role;
ALTER TABLE public.site_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Counters are public" ON public.site_counters FOR SELECT USING (true);
INSERT INTO public.site_counters (key, value) VALUES ('visits', 128407);

CREATE OR REPLACE FUNCTION public.increment_counter(_key text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v bigint;
BEGIN
  IF _key NOT IN ('visits') THEN
    RAISE EXCEPTION 'unknown counter';
  END IF;
  UPDATE public.site_counters SET value = value + 1, updated_at = now() WHERE key = _key RETURNING value INTO v;
  RETURN v;
END;
$$;
REVOKE ALL ON FUNCTION public.increment_counter(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_counter(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.moderate_direct_message()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  body text := btrim(NEW.content);
  banned text[] := ARRAY['fuck','shit','bitch','asshole','bastard','cunt','whore','slut','nigger','faggot','rape','kill yourself','kys','child porn','nudes','porn'];
  w text;
BEGIN
  IF body = '' THEN
    RAISE EXCEPTION 'Message cannot be empty.';
  END IF;
  IF length(body) > 2000 THEN
    RAISE EXCEPTION 'Message is too long (2000 characters max).';
  END IF;
  IF body ~* '(https?://|www\.|\.exe|\.apk|\.bat|\.scr|\.vbs|\.jar|magnet:|data:application)' THEN
    RAISE EXCEPTION 'Links, files and attachments are not allowed in SSRA chat.';
  END IF;
  FOREACH w IN ARRAY banned LOOP
    IF body ~* ('(^|[^a-z])' || w || '([^a-z]|$)') THEN
      RAISE EXCEPTION 'Message blocked by SSRA chat moderation.';
    END IF;
  END LOOP;
  NEW.content := body;
  RETURN NEW;
END;
$$;
CREATE TRIGGER direct_messages_moderate BEFORE INSERT ON public.direct_messages
  FOR EACH ROW EXECUTE FUNCTION public.moderate_direct_message();

CREATE POLICY "Members read avatars" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');
CREATE POLICY "Members upload their own avatar" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Members update their own avatar" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Members delete their own avatar" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);