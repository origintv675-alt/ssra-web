-- 1. Profile economy columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS space_tokens bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_pro boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lifetime_pro boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS badge text,
  ADD COLUMN IF NOT EXISTS pro_since timestamptz;

-- 2. Promo codes
CREATE TABLE IF NOT EXISTS public.promo_codes (
  code text PRIMARY KEY,
  tokens bigint NOT NULL DEFAULT 0,
  grants_pro boolean NOT NULL DEFAULT false,
  lifetime boolean NOT NULL DEFAULT false,
  badge text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.promo_codes TO authenticated;
GRANT ALL ON public.promo_codes TO service_role;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can see active promo codes" ON public.promo_codes
  FOR SELECT TO authenticated USING (active);
CREATE TRIGGER promo_codes_set_updated_at BEFORE UPDATE ON public.promo_codes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.promo_codes (code, tokens, grants_pro, lifetime, badge) VALUES
  ('SNOOPY', 15000, false, false, NULL),
  ('EK55-6/H', 600, false, false, NULL),
  ('SPACE', 5000, false, false, NULL),
  ('REVEALTHETHING', 1000000000, true, true, 'here from the start')
ON CONFLICT (code) DO NOTHING;

-- 3. Promo redemptions
CREATE TABLE IF NOT EXISTS public.promo_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  code text NOT NULL REFERENCES public.promo_codes(code) ON DELETE CASCADE,
  tokens_awarded bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, code)
);
GRANT SELECT ON public.promo_redemptions TO authenticated;
GRANT ALL ON public.promo_redemptions TO service_role;
ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read own redemptions" ON public.promo_redemptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 4. Daily task completions
CREATE TABLE IF NOT EXISTS public.task_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  task_id text NOT NULL,
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  tokens bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, task_id, day)
);
GRANT SELECT ON public.task_completions TO authenticated;
GRANT ALL ON public.task_completions TO service_role;
ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read own task history" ON public.task_completions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 5. Push subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage own push subscriptions" ON public.push_subscriptions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER push_subscriptions_set_updated_at BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. Images in member chat
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS image_url text;

CREATE OR REPLACE FUNCTION public.moderate_direct_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  body text := btrim(coalesce(NEW.content, ''));
  banned text[] := ARRAY['fuck','shit','bitch','asshole','bastard','cunt','whore','slut','nigger','faggot','rape','kill yourself','kys','child porn','nudes','porn'];
  w text;
BEGIN
  IF body = '' AND NEW.image_url IS NULL THEN
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
  IF NEW.image_url IS NOT NULL AND NEW.image_url !~* '^https://[a-z0-9.-]+/storage/v1/object/public/community-media/' THEN
    RAISE EXCEPTION 'Images must be uploaded through SSRA chat.';
  END IF;
  NEW.content := body;
  RETURN NEW;
END;
$function$;

-- 7. Token / promo / pro RPCs
CREATE OR REPLACE FUNCTION public.complete_daily_task(_task_id text, _tokens bigint)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE uid uuid := auth.uid(); bal bigint;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Sign in to earn space tokens.'; END IF;
  IF _tokens < 0 OR _tokens > 1000 THEN RAISE EXCEPTION 'Invalid task reward.'; END IF;
  INSERT INTO public.task_completions (user_id, task_id, tokens) VALUES (uid, _task_id, _tokens);
  UPDATE public.profiles SET space_tokens = space_tokens + _tokens WHERE id = uid RETURNING space_tokens INTO bal;
  RETURN coalesce(bal, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.redeem_promo_code(_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE uid uuid := auth.uid(); c public.promo_codes; bal bigint; norm text := upper(btrim(_code));
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Sign in to redeem a promo code.'; END IF;
  SELECT * INTO c FROM public.promo_codes WHERE upper(code) = norm AND active;
  IF NOT FOUND THEN RAISE EXCEPTION 'That promo code is not valid.'; END IF;
  IF EXISTS (SELECT 1 FROM public.promo_redemptions WHERE user_id = uid AND code = c.code) THEN
    RAISE EXCEPTION 'You have already used this promo code.';
  END IF;
  INSERT INTO public.promo_redemptions (user_id, code, tokens_awarded) VALUES (uid, c.code, c.tokens);
  UPDATE public.profiles SET
    space_tokens = space_tokens + c.tokens,
    is_pro = is_pro OR c.grants_pro,
    lifetime_pro = lifetime_pro OR c.lifetime,
    badge = coalesce(c.badge, badge),
    pro_since = CASE WHEN c.grants_pro AND pro_since IS NULL THEN now() ELSE pro_since END
  WHERE id = uid RETURNING space_tokens INTO bal;
  RETURN jsonb_build_object('code', c.code, 'tokens', c.tokens, 'balance', coalesce(bal,0),
    'pro', c.grants_pro, 'lifetime', c.lifetime, 'badge', c.badge);
END;
$$;

CREATE OR REPLACE FUNCTION public.unlock_pro_with_tokens()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE uid uuid := auth.uid(); bal bigint; cost bigint := 6000;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Sign in first.'; END IF;
  SELECT space_tokens INTO bal FROM public.profiles WHERE id = uid FOR UPDATE;
  IF bal IS NULL THEN RAISE EXCEPTION 'Profile not found.'; END IF;
  IF bal < cost THEN RAISE EXCEPTION 'You need % space tokens to unlock Pro.', cost; END IF;
  UPDATE public.profiles SET space_tokens = space_tokens - cost, is_pro = true,
    pro_since = coalesce(pro_since, now()) WHERE id = uid RETURNING space_tokens INTO bal;
  RETURN jsonb_build_object('balance', bal, 'pro', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_daily_task(text, bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_promo_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unlock_pro_with_tokens() TO authenticated;