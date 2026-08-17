CREATE TABLE IF NOT EXISTS public.guest_task_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id uuid NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  task_id text NOT NULL,
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  tokens integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (guest_id, task_id, day)
);

GRANT SELECT ON public.guest_task_completions TO anon, authenticated;
GRANT ALL ON public.guest_task_completions TO service_role;

ALTER TABLE public.guest_task_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guest task completions are readable"
ON public.guest_task_completions FOR SELECT
TO anon, authenticated
USING (true);

CREATE OR REPLACE FUNCTION public.guest_complete_task(_guest_id uuid, _task_id text, _tokens integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  g public.guests%ROWTYPE;
  award integer := LEAST(GREATEST(COALESCE(_tokens, 0), 0), 1000);
BEGIN
  SELECT * INTO g FROM public.guests WHERE id = _guest_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Guest account not found.'); END IF;
  IF g.banned THEN RETURN jsonb_build_object('error', 'This guest account is banned.'); END IF;

  IF EXISTS (
    SELECT 1 FROM public.guest_task_completions
    WHERE guest_id = _guest_id AND task_id = _task_id AND day = (now() AT TIME ZONE 'utc')::date
  ) THEN
    RETURN jsonb_build_object('error', 'Task already claimed today.');
  END IF;

  INSERT INTO public.guest_task_completions (guest_id, task_id, tokens)
  VALUES (_guest_id, _task_id, award);

  UPDATE public.guests
     SET space_tokens = space_tokens + award
   WHERE id = _guest_id
  RETURNING * INTO g;

  RETURN jsonb_build_object('ok', true, 'tokens', award, 'balance', g.space_tokens);
END;
$$;

CREATE OR REPLACE FUNCTION public.guest_unlock_pro(_guest_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  g public.guests%ROWTYPE;
  cost integer := 6000;
BEGIN
  SELECT * INTO g FROM public.guests WHERE id = _guest_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Guest account not found.'); END IF;
  IF g.banned THEN RETURN jsonb_build_object('error', 'This guest account is banned.'); END IF;
  IF g.is_pro OR g.lifetime_pro THEN
    RETURN jsonb_build_object('ok', true, 'pro', true, 'balance', g.space_tokens);
  END IF;
  IF g.space_tokens < cost THEN
    RETURN jsonb_build_object('error', 'Not enough space tokens yet.');
  END IF;

  UPDATE public.guests
     SET space_tokens = space_tokens - cost, is_pro = true
   WHERE id = _guest_id
  RETURNING * INTO g;

  RETURN jsonb_build_object('ok', true, 'pro', true, 'balance', g.space_tokens);
END;
$$;

GRANT EXECUTE ON FUNCTION public.guest_complete_task(uuid, text, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guest_unlock_pro(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Members can view their own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Pets are viewable by everyone" ON public.pets;
DROP POLICY IF EXISTS "Lobby is readable by everyone" ON public.lobby_messages;

CREATE OR REPLACE FUNCTION public.lobby_feed(_limit integer DEFAULT 150)
RETURNS TABLE (id uuid, author_name text, content text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.id, m.author_name, m.content, m.created_at
  FROM public.lobby_messages m
  ORDER BY m.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(_limit, 150), 1), 200)
$$;
REVOKE ALL ON FUNCTION public.lobby_feed(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lobby_feed(integer) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.guest_complete_task(uuid, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guest_unlock_pro(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.moderate_direct_message() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guest_complete_task(uuid, text, integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.guest_unlock_pro(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.member_directory()
RETURNS TABLE (
  id uuid, username text, avatar_url text, bio text,
  badge text, is_pro boolean, created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.username, p.avatar_url, p.bio, p.badge, p.is_pro, p.created_at
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
  ORDER BY p.created_at DESC
$$;

REVOKE ALL ON FUNCTION public.member_directory() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.member_directory() TO authenticated, service_role;

ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS accessory text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS eyes text NOT NULL DEFAULT 'round',
  ADD COLUMN IF NOT EXISTS size integer NOT NULL DEFAULT 64,
  ADD COLUMN IF NOT EXISTS personality text NOT NULL DEFAULT 'curious',
  ADD COLUMN IF NOT EXISTS trail text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS sparkle_color text NOT NULL DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS happiness integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS times_petted integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.save_pet(_pet jsonb, _guest_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); pid uuid := nullif(_pet->>'id','')::uuid; owner text; r public.pets;
BEGIN
  IF uid IS NULL AND _guest_id IS NULL THEN RAISE EXCEPTION 'No account found.'; END IF;
  IF uid IS NOT NULL THEN SELECT username INTO owner FROM public.profiles WHERE id = uid;
  ELSE SELECT name INTO owner FROM public.guests WHERE id = _guest_id AND NOT banned;
    IF owner IS NULL THEN RAISE EXCEPTION 'Guest account unavailable.'; END IF;
  END IF;
  IF pid IS NOT NULL THEN
    UPDATE public.pets SET
      name = coalesce(_pet->>'name', name),
      species = coalesce(_pet->>'species', species),
      body_color = coalesce(_pet->>'body_color', body_color),
      accent_color = coalesce(_pet->>'accent_color', accent_color),
      pattern = coalesce(_pet->>'pattern', pattern),
      aura = coalesce(_pet->>'aura', aura),
      accessory = coalesce(_pet->>'accessory', accessory),
      eyes = coalesce(_pet->>'eyes', eyes),
      size = least(greatest(coalesce((_pet->>'size')::integer, size), 32), 140),
      personality = coalesce(_pet->>'personality', personality),
      trail = coalesce(_pet->>'trail', trail),
      sparkle_color = coalesce(_pet->>'sparkle_color', sparkle_color),
      enabled = coalesce((_pet->>'enabled')::boolean, enabled)
    WHERE id = pid AND ((uid IS NOT NULL AND user_id = uid) OR (_guest_id IS NOT NULL AND guest_id = _guest_id))
    RETURNING * INTO r;
    IF NOT FOUND THEN RAISE EXCEPTION 'Pet not found.'; END IF;
  ELSE
    INSERT INTO public.pets (user_id, guest_id, owner_name, name, species, body_color, accent_color, pattern, aura,
      accessory, eyes, size, personality, trail, sparkle_color, enabled)
    VALUES (uid, _guest_id, coalesce(owner,'Explorer'), coalesce(nullif(_pet->>'name',''),'Nova'),
      coalesce(_pet->>'species','nebula-cat'), coalesce(_pet->>'body_color','#7dd3fc'),
      coalesce(_pet->>'accent_color','#f0abfc'), coalesce(_pet->>'pattern','stars'),
      coalesce(_pet->>'aura','soft'),
      coalesce(_pet->>'accessory','none'), coalesce(_pet->>'eyes','round'),
      least(greatest(coalesce((_pet->>'size')::integer, 64), 32), 140),
      coalesce(_pet->>'personality','curious'), coalesce(_pet->>'trail','none'),
      coalesce(_pet->>'sparkle_color','#ffffff'),
      coalesce((_pet->>'enabled')::boolean, true))
    RETURNING * INTO r;
  END IF;
  RETURN to_jsonb(r);
END;
$$;

DROP FUNCTION IF EXISTS public.guest_pets(uuid);
CREATE FUNCTION public.guest_pets(_guest_id uuid)
RETURNS TABLE (
  id uuid, name text, species text, body_color text, accent_color text,
  pattern text, aura text, enabled boolean, owner_name text,
  accessory text, eyes text, size integer, personality text, trail text,
  sparkle_color text, happiness integer, times_petted integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.name, p.species, p.body_color, p.accent_color,
         p.pattern, p.aura, p.enabled, p.owner_name,
         p.accessory, p.eyes, p.size, p.personality, p.trail,
         p.sparkle_color, p.happiness, p.times_petted
  FROM public.pets p
  WHERE _guest_id IS NOT NULL AND p.guest_id = _guest_id
  ORDER BY p.created_at ASC
$$;
REVOKE ALL ON FUNCTION public.guest_pets(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guest_pets(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.pet_the_pet(_id uuid, _guest_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); r public.pets;
BEGIN
  UPDATE public.pets SET
    happiness = least(happiness + 2, 100),
    times_petted = times_petted + 1
  WHERE id = _id
    AND ((uid IS NOT NULL AND user_id = uid) OR (_guest_id IS NOT NULL AND guest_id = _guest_id))
  RETURNING * INTO r;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pet not found.'; END IF;
  RETURN to_jsonb(r);
END;
$$;
REVOKE ALL ON FUNCTION public.pet_the_pet(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pet_the_pet(uuid, uuid) TO anon, authenticated, service_role;

drop policy if exists "Members upload own chat images" on storage.objects;
create policy "Members upload own chat images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'community-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Members read chat images" on storage.objects;
create policy "Members read chat images" on storage.objects
  for select to authenticated
  using (bucket_id = 'community-media');

drop policy if exists "Members delete own chat images" on storage.objects;
create policy "Members delete own chat images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'community-media' and (storage.foldername(name))[1] = auth.uid()::text);

CREATE TABLE IF NOT EXISTS public.banned_ips (
  ip text PRIMARY KEY,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.banned_ips TO service_role;
ALTER TABLE public.banned_ips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Banned ips backend only" ON public.banned_ips;
CREATE POLICY "Banned ips backend only" ON public.banned_ips FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.page_locks (
  path text PRIMARY KEY,
  message text,
  locked_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.page_locks TO service_role;
ALTER TABLE public.page_locks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Page locks backend only" ON public.page_locks;
CREATE POLICY "Page locks backend only" ON public.page_locks FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.site_popups ADD COLUMN IF NOT EXISTS target_user_id uuid;
ALTER TABLE public.site_popups ADD COLUMN IF NOT EXISTS target_guest_id uuid;

ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS last_ip text;
ALTER TABLE public.live_visitors ADD COLUMN IF NOT EXISTS ip text;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ban_reason text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS muted_until timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS kicked_at timestamptz;

DELETE FROM public.promo_redemptions a USING public.promo_redemptions b
  WHERE a.ctid < b.ctid AND a.user_id = b.user_id AND a.code = b.code;
DELETE FROM public.guest_promo_redemptions a USING public.guest_promo_redemptions b
  WHERE a.ctid < b.ctid AND a.guest_id = b.guest_id AND a.code = b.code;
DELETE FROM public.task_completions a USING public.task_completions b
  WHERE a.ctid < b.ctid AND a.user_id = b.user_id AND a.task_id = b.task_id AND a.day = b.day;
DELETE FROM public.guest_task_completions a USING public.guest_task_completions b
  WHERE a.ctid < b.ctid AND a.guest_id = b.guest_id AND a.task_id = b.task_id AND a.day = b.day;

CREATE UNIQUE INDEX IF NOT EXISTS promo_redemptions_once ON public.promo_redemptions (user_id, code);
CREATE UNIQUE INDEX IF NOT EXISTS guest_promo_redemptions_once ON public.guest_promo_redemptions (guest_id, code);
CREATE UNIQUE INDEX IF NOT EXISTS task_completions_daily ON public.task_completions (user_id, task_id, day);
CREATE UNIQUE INDEX IF NOT EXISTS guest_task_completions_daily ON public.guest_task_completions (guest_id, task_id, day);

CREATE OR REPLACE FUNCTION public.complete_daily_task(_task_id text, _tokens bigint)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE uid uuid := auth.uid(); bal bigint;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Sign in to earn space tokens.'; END IF;
  IF _tokens < 0 OR _tokens > 1000 THEN RAISE EXCEPTION 'Invalid task reward.'; END IF;
  IF EXISTS (SELECT 1 FROM public.task_completions
             WHERE user_id = uid AND task_id = _task_id AND day = (now() AT TIME ZONE 'utc')::date) THEN
    RAISE EXCEPTION 'Mission already claimed today.';
  END IF;
  INSERT INTO public.task_completions (user_id, task_id, tokens) VALUES (uid, _task_id, _tokens);
  UPDATE public.profiles SET space_tokens = space_tokens + _tokens WHERE id = uid RETURNING space_tokens INTO bal;
  RETURN coalesce(bal, 0);
END;
$function$;

CREATE OR REPLACE FUNCTION public.post_lobby_message(_content text, _guest_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE uid uuid := auth.uid(); nm text; prof public.profiles; body text := btrim(coalesce(_content, ''));
  blocked_words text[] := ARRAY['fuck','shit','bitch','asshole','bastard','cunt','whore','slut','nigger','faggot','rape','kill yourself','kys','child porn','nudes','porn'];
  w text; row_id uuid;
BEGIN
  IF body = '' THEN RAISE EXCEPTION 'Message cannot be empty.'; END IF;
  IF length(body) > 1000 THEN RAISE EXCEPTION 'Message is too long (1000 characters max).'; END IF;
  IF body ~* '(https?://|www\.|\.exe|\.apk|\.bat|\.scr|\.vbs|\.jar|magnet:)' THEN
    RAISE EXCEPTION 'Links and files are not allowed in SSRA chat.';
  END IF;
  FOREACH w IN ARRAY blocked_words LOOP
    IF body ~* ('(^|[^a-z])' || w || '([^a-z]|$)') THEN
      RAISE EXCEPTION 'Message blocked by SSRA chat moderation.';
    END IF;
  END LOOP;
  IF uid IS NOT NULL THEN
    SELECT * INTO prof FROM public.profiles WHERE id = uid;
    IF prof.banned THEN RAISE EXCEPTION 'You are banned from SSRA chat.'; END IF;
    IF prof.muted_until IS NOT NULL AND prof.muted_until > now() THEN
      RAISE EXCEPTION 'You are muted until %.', to_char(prof.muted_until, 'HH24:MI');
    END IF;
    INSERT INTO public.lobby_messages (user_id, author_name, content)
    VALUES (uid, coalesce(prof.username, 'Member'), body) RETURNING id INTO row_id;
  ELSE
    SELECT g.name INTO nm FROM public.guests g WHERE g.id = _guest_id AND NOT g.banned;
    IF nm IS NULL THEN RAISE EXCEPTION 'Guest account unavailable.'; END IF;
    INSERT INTO public.lobby_messages (guest_id, author_name, content)
    VALUES (_guest_id, nm, body) RETURNING id INTO row_id;
  END IF;
  RETURN jsonb_build_object('id', row_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_direct_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE sender text;
BEGIN
  SELECT username INTO sender FROM public.profiles WHERE id = NEW.sender_id;
  INSERT INTO public.notifications (user_id, title, body, kind)
  VALUES (NEW.recipient_id,
          'New message from ' || coalesce(sender, 'a member'),
          left(coalesce(NEW.content, 'Sent an image'), 140),
          'message');
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS direct_messages_notify ON public.direct_messages;
CREATE TRIGGER direct_messages_notify AFTER INSERT ON public.direct_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_direct_message();

REVOKE ALL ON FUNCTION public.post_lobby_message(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guest_state(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_direct_message() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.post_lobby_message(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guest_state(uuid) TO anon, authenticated;

ALTER TABLE public.page_locks ADD COLUMN IF NOT EXISTS id uuid NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE public.page_locks ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE public.page_locks ADD COLUMN IF NOT EXISTS target_user_id uuid;
ALTER TABLE public.page_locks ADD COLUMN IF NOT EXISTS target_guest_id uuid;

ALTER TABLE public.page_locks DROP CONSTRAINT IF EXISTS page_locks_pkey;
ALTER TABLE public.page_locks ADD CONSTRAINT page_locks_pkey PRIMARY KEY (id);
CREATE UNIQUE INDEX IF NOT EXISTS page_locks_global_path_idx
  ON public.page_locks (path)
  WHERE target_user_id IS NULL AND target_guest_id IS NULL;

ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS sky_override text;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS animations_enabled boolean NOT NULL DEFAULT true;

DROP POLICY IF EXISTS "Page locks are public" ON public.page_locks;
REVOKE SELECT ON public.page_locks FROM anon, authenticated;

DROP POLICY IF EXISTS "Popups are public" ON public.site_popups;
REVOKE SELECT ON public.site_popups FROM anon, authenticated;

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

REVOKE ALL ON FUNCTION public.notify_friendship() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_direct_message() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

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