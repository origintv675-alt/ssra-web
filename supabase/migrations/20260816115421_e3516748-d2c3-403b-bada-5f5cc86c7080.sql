-- 1. IP bans
CREATE TABLE IF NOT EXISTS public.banned_ips (
  ip text PRIMARY KEY,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.banned_ips TO service_role;
ALTER TABLE public.banned_ips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Banned ips backend only" ON public.banned_ips;
CREATE POLICY "Banned ips backend only" ON public.banned_ips FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. Page locks
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

-- 3. Targeted popups
ALTER TABLE public.site_popups ADD COLUMN IF NOT EXISTS target_user_id uuid;
ALTER TABLE public.site_popups ADD COLUMN IF NOT EXISTS target_guest_id uuid;

-- 4. IP tracking
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS last_ip text;
ALTER TABLE public.live_visitors ADD COLUMN IF NOT EXISTS ip text;

-- 5. Member moderation fields
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ban_reason text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS muted_until timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS kicked_at timestamptz;

-- 6. One-time promo codes and one-a-day missions
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

-- 7. Daily task claim: one per day, clear error instead of a raw constraint failure
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

-- 8. Chat: block banned or muted members
CREATE OR REPLACE FUNCTION public.post_lobby_message(_content text, _guest_id uuid DEFAULT NULL::uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE uid uuid := auth.uid(); nm text; prof public.profiles; body text := btrim(coalesce(_content, ''));
  banned text[] := ARRAY['fuck','shit','bitch','asshole','bastard','cunt','whore','slut','nigger','faggot','rape','kill yourself','kys','child porn','nudes','porn'];
  w text; row_id uuid;
BEGIN
  IF body = '' THEN RAISE EXCEPTION 'Message cannot be empty.'; END IF;
  IF length(body) > 1000 THEN RAISE EXCEPTION 'Message is too long (1000 characters max).'; END IF;
  IF body ~* '(https?://|www\.|\.exe|\.apk|\.bat|\.scr|\.vbs|\.jar|magnet:)' THEN
    RAISE EXCEPTION 'Links and files are not allowed in SSRA chat.';
  END IF;
  FOREACH w IN ARRAY banned LOOP
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

-- 9. Direct message notifications
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