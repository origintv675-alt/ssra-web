-- 1. One-time promo codes -----------------------------------------------
DELETE FROM public.promo_redemptions a
  USING public.promo_redemptions b
  WHERE a.ctid < b.ctid AND a.user_id = b.user_id AND a.code = b.code;
ALTER TABLE public.promo_redemptions
  ADD CONSTRAINT promo_redemptions_user_code_key UNIQUE (user_id, code);

DELETE FROM public.guest_promo_redemptions a
  USING public.guest_promo_redemptions b
  WHERE a.ctid < b.ctid AND a.guest_id = b.guest_id AND a.code = b.code;
ALTER TABLE public.guest_promo_redemptions
  ADD CONSTRAINT guest_promo_redemptions_guest_code_key UNIQUE (guest_id, code);

-- 2. Daily missions: one claim per task per day ---------------------------
DELETE FROM public.task_completions a
  USING public.task_completions b
  WHERE a.ctid < b.ctid AND a.user_id = b.user_id AND a.task_id = b.task_id AND a.day = b.day;
ALTER TABLE public.task_completions
  ADD CONSTRAINT task_completions_user_task_day_key UNIQUE (user_id, task_id, day);

DELETE FROM public.guest_task_completions a
  USING public.guest_task_completions b
  WHERE a.ctid < b.ctid AND a.guest_id = b.guest_id AND a.task_id = b.task_id AND a.day = b.day;
ALTER TABLE public.guest_task_completions
  ADD CONSTRAINT guest_task_completions_guest_task_day_key UNIQUE (guest_id, task_id, day);

-- 3. IP bans --------------------------------------------------------------
CREATE TABLE public.banned_ips (
  ip text PRIMARY KEY,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.banned_ips TO service_role;
ALTER TABLE public.banned_ips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Banned ips backend only" ON public.banned_ips
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS last_ip text;
ALTER TABLE public.live_visitors ADD COLUMN IF NOT EXISTS ip text;

-- 4. Page locks -----------------------------------------------------------
CREATE TABLE public.page_locks (
  path text PRIMARY KEY,
  message text,
  locked_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.page_locks TO anon, authenticated;
GRANT ALL ON public.page_locks TO service_role;
ALTER TABLE public.page_locks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Page locks are public" ON public.page_locks
  FOR SELECT TO anon, authenticated USING (true);

-- 5. Targeted pop-ups -----------------------------------------------------
ALTER TABLE public.site_popups ADD COLUMN IF NOT EXISTS target_user_id uuid;
ALTER TABLE public.site_popups ADD COLUMN IF NOT EXISTS target_guest_id uuid;

-- 6. Member moderation ----------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ban_reason text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS muted_until timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS kicked_at timestamptz;

-- Chat posting respects bans and mutes.
CREATE OR REPLACE FUNCTION public.post_lobby_message(_content text, _guest_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE uid uuid := auth.uid(); nm text; body text := btrim(coalesce(_content, ''));
  banned_words text[] := ARRAY['fuck','shit','bitch','asshole','bastard','cunt','whore','slut','nigger','faggot','rape','kill yourself','kys','child porn','nudes','porn'];
  w text; row_id uuid; prof public.profiles;
BEGIN
  IF body = '' THEN RAISE EXCEPTION 'Message cannot be empty.'; END IF;
  IF length(body) > 1000 THEN RAISE EXCEPTION 'Message is too long (1000 characters max).'; END IF;
  IF body ~* '(https?://|www\.)' THEN RAISE EXCEPTION 'Links are not allowed in SSRA chat.'; END IF;
  FOREACH w IN ARRAY banned_words LOOP
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
    SELECT name INTO nm FROM public.guests WHERE id = _guest_id AND NOT banned;
    IF nm IS NULL THEN RAISE EXCEPTION 'Guest account unavailable.'; END IF;
    INSERT INTO public.lobby_messages (guest_id, author_name, content)
    VALUES (_guest_id, nm, body) RETURNING id INTO row_id;
  END IF;
  RETURN jsonb_build_object('id', row_id);
END;
$function$;

-- 7. Direct-message notifications -----------------------------------------
CREATE OR REPLACE FUNCTION public.notify_direct_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE sender_name text;
BEGIN
  SELECT username INTO sender_name FROM public.profiles WHERE id = NEW.sender_id;
  INSERT INTO public.notifications (user_id, title, body, kind)
  VALUES (
    NEW.recipient_id,
    'New message from ' || coalesce(sender_name, 'a member'),
    left(coalesce(nullif(NEW.content, ''), 'Sent an image'), 140),
    'message'
  );
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS direct_messages_notify ON public.direct_messages;
CREATE TRIGGER direct_messages_notify
AFTER INSERT ON public.direct_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_direct_message();

-- 8. Guest state exposes kick + ban details (unchanged shape, adds ip touch)
CREATE OR REPLACE FUNCTION public.guest_state(_guest_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE g public.guests;
BEGIN
  UPDATE public.guests SET last_seen_at = now() WHERE id = _guest_id RETURNING * INTO g;
  IF NOT FOUND THEN RETURN jsonb_build_object('missing', true); END IF;
  RETURN jsonb_build_object('id', g.id, 'name', g.name, 'space_tokens', g.space_tokens,
    'is_pro', g.is_pro, 'lifetime_pro', g.lifetime_pro, 'badge', g.badge,
    'banned', g.banned, 'ban_reason', g.ban_reason, 'kicked_at', g.kicked_at);
END;
$function$;