-- 1. Fix ambiguous "banned" reference blocking guest lobby posts
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

-- 2. Targeted + expiring page locks
ALTER TABLE public.page_locks ADD COLUMN IF NOT EXISTS id uuid NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE public.page_locks ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE public.page_locks ADD COLUMN IF NOT EXISTS target_user_id uuid;
ALTER TABLE public.page_locks ADD COLUMN IF NOT EXISTS target_guest_id uuid;

ALTER TABLE public.page_locks DROP CONSTRAINT IF EXISTS page_locks_pkey;
ALTER TABLE public.page_locks ADD CONSTRAINT page_locks_pkey PRIMARY KEY (id);
CREATE UNIQUE INDEX IF NOT EXISTS page_locks_global_path_idx
  ON public.page_locks (path)
  WHERE target_user_id IS NULL AND target_guest_id IS NULL;

-- 3. Site-wide display controls
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS sky_override text;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS animations_enabled boolean NOT NULL DEFAULT true;