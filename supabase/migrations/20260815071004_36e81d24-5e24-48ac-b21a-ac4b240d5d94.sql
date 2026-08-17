CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL,
  avatar_url text,
  bio text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX profiles_username_lower_idx ON public.profiles (lower(username));
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_messages_user_created_idx ON public.ai_messages (user_id, created_at);
GRANT SELECT, INSERT, DELETE ON public.ai_messages TO authenticated;
GRANT ALL ON public.ai_messages TO service_role;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own ai messages" ON public.ai_messages FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX direct_messages_pair_idx ON public.direct_messages (sender_id, recipient_id, created_at);
GRANT SELECT, INSERT ON public.direct_messages TO authenticated;
GRANT ALL ON public.direct_messages TO service_role;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants can read their messages" ON public.direct_messages FOR SELECT TO authenticated USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
CREATE POLICY "Senders can send messages" ON public.direct_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;

CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  location text,
  starts_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.events TO anon, authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Events are viewable by everyone" ON public.events FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'username', ''), split_part(NEW.email, '@', 1), 'explorer')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated, public;

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

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS space_tokens bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_pro boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lifetime_pro boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS badge text,
  ADD COLUMN IF NOT EXISTS pro_since timestamptz;

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

ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS image_url text;

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

REVOKE EXECUTE ON FUNCTION public.complete_daily_task(text, bigint) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.redeem_promo_code(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.unlock_pro_with_tokens() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_daily_task(text, bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_promo_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unlock_pro_with_tokens() TO authenticated;

CREATE TABLE public.push_digests (
  day date NOT NULL PRIMARY KEY,
  title text NOT NULL,
  body text NOT NULL,
  sent_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT ALL ON public.push_digests TO service_role;
ALTER TABLE public.push_digests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Digest log is backend only" ON public.push_digests FOR ALL TO service_role USING (true) WITH CHECK (true);

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
  IF NEW.image_url IS NOT NULL AND NEW.image_url !~* ('^' || (NEW.sender_id)::text || '/[a-z0-9._-]+\.(png|jpe?g|webp|gif)$') THEN
    RAISE EXCEPTION 'Images must be uploaded through SSRA chat.';
  END IF;
  NEW.content := body;
  RETURN NEW;
END;
$function$;
CREATE TRIGGER direct_messages_moderate BEFORE INSERT ON public.direct_messages
  FOR EACH ROW EXECUTE FUNCTION public.moderate_direct_message();