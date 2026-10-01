ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS equipped_badges text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS is_rich boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rich_reward_day date;

ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS equipped_badges text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS is_rich boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rich_reward_day date;

UPDATE public.profiles
SET equipped_badges = ARRAY[badge]
WHERE badge IS NOT NULL AND btrim(badge) <> '' AND cardinality(equipped_badges) = 0;

UPDATE public.guests
SET equipped_badges = ARRAY[badge]
WHERE badge IS NOT NULL AND btrim(badge) <> '' AND cardinality(equipped_badges) = 0;

CREATE OR REPLACE FUNCTION public.unlock_rich_with_tokens(_guest_id uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  bal bigint;
  cost bigint := 20000;
  rich_badge text := 'Rich as hell!';
BEGIN
  IF uid IS NOT NULL THEN
    SELECT space_tokens INTO bal FROM public.profiles WHERE id = uid FOR UPDATE;
    IF bal IS NULL THEN RAISE EXCEPTION 'Profile not found.'; END IF;
    IF bal < cost THEN RAISE EXCEPTION 'You need % space tokens to unlock Rich as hell!.', cost; END IF;
    UPDATE public.profiles
    SET space_tokens = space_tokens - cost,
        is_pro = true,
        is_rich = true,
        pro_since = coalesce(pro_since, now()),
        equipped_badges = CASE WHEN rich_badge = ANY(equipped_badges) THEN equipped_badges ELSE array_append(equipped_badges, rich_badge) END
    WHERE id = uid
    RETURNING space_tokens INTO bal;
  ELSIF _guest_id IS NOT NULL THEN
    SELECT space_tokens INTO bal FROM public.guests WHERE id = _guest_id AND NOT banned FOR UPDATE;
    IF bal IS NULL THEN RAISE EXCEPTION 'Guest account unavailable.'; END IF;
    IF bal < cost THEN RAISE EXCEPTION 'You need % space tokens to unlock Rich as hell!.', cost; END IF;
    UPDATE public.guests
    SET space_tokens = space_tokens - cost,
        is_pro = true,
        is_rich = true,
        equipped_badges = CASE WHEN rich_badge = ANY(equipped_badges) THEN equipped_badges ELSE array_append(equipped_badges, rich_badge) END
    WHERE id = _guest_id
    RETURNING space_tokens INTO bal;
  ELSE
    RAISE EXCEPTION 'Create a guest account or sign in first.';
  END IF;

  RETURN jsonb_build_object('balance', bal, 'rich', true, 'badge', rich_badge);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.unlock_rich_with_tokens(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.claim_rich_daily(_guest_id uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  today date := (now() AT TIME ZONE 'utc')::date;
  bal bigint;
BEGIN
  IF uid IS NOT NULL THEN
    UPDATE public.profiles
    SET space_tokens = space_tokens + 150,
        rich_reward_day = today
    WHERE id = uid AND is_rich AND rich_reward_day IS DISTINCT FROM today
    RETURNING space_tokens INTO bal;
    IF bal IS NULL THEN
      IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = uid AND is_rich) THEN
        RAISE EXCEPTION 'Rich as hell! membership required.';
      END IF;
      RAISE EXCEPTION 'Daily Rich reward already claimed.';
    END IF;
  ELSIF _guest_id IS NOT NULL THEN
    UPDATE public.guests
    SET space_tokens = space_tokens + 150,
        rich_reward_day = today
    WHERE id = _guest_id AND is_rich AND NOT banned AND rich_reward_day IS DISTINCT FROM today
    RETURNING space_tokens INTO bal;
    IF bal IS NULL THEN
      IF NOT EXISTS (SELECT 1 FROM public.guests WHERE id = _guest_id AND is_rich AND NOT banned) THEN
        RAISE EXCEPTION 'Rich as hell! membership required.';
      END IF;
      RAISE EXCEPTION 'Daily Rich reward already claimed.';
    END IF;
  ELSE
    RAISE EXCEPTION 'Create a guest account or sign in first.';
  END IF;

  RETURN jsonb_build_object('balance', bal, 'tokens', 150, 'day', today);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.claim_rich_daily(uuid) TO anon, authenticated;