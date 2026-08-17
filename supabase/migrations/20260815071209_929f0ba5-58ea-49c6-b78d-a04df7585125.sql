-- Roles
CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Guests
CREATE TABLE public.guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  space_tokens bigint NOT NULL DEFAULT 0,
  is_pro boolean NOT NULL DEFAULT false,
  lifetime_pro boolean NOT NULL DEFAULT false,
  badge text,
  banned boolean NOT NULL DEFAULT false,
  ban_reason text,
  kicked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.guests TO service_role;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Guests are backend only" ON public.guests FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE public.guest_promo_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id uuid NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  code text NOT NULL REFERENCES public.promo_codes(code) ON DELETE CASCADE,
  tokens_awarded bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (guest_id, code)
);
GRANT ALL ON public.guest_promo_redemptions TO service_role;
ALTER TABLE public.guest_promo_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Guest redemptions backend only" ON public.guest_promo_redemptions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Lobby chat (guests + members)
CREATE TABLE public.lobby_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_id uuid REFERENCES public.guests(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX lobby_messages_created_idx ON public.lobby_messages (created_at DESC);
GRANT SELECT ON public.lobby_messages TO anon, authenticated;
GRANT ALL ON public.lobby_messages TO service_role;
ALTER TABLE public.lobby_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lobby is readable by everyone" ON public.lobby_messages FOR SELECT USING (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.lobby_messages;

-- Site control tables
CREATE TABLE public.site_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  shutdown_until timestamptz,
  shutdown_message text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Site settings are public" ON public.site_settings FOR SELECT USING (true);
INSERT INTO public.site_settings (id) VALUES (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.site_settings;

CREATE TABLE public.site_effects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  effect text NOT NULL,
  intensity integer NOT NULL DEFAULT 3,
  duration_seconds integer NOT NULL DEFAULT 12,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX site_effects_created_idx ON public.site_effects (created_at DESC);
GRANT SELECT ON public.site_effects TO anon, authenticated;
GRANT ALL ON public.site_effects TO service_role;
ALTER TABLE public.site_effects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Effects are public" ON public.site_effects FOR SELECT USING (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.site_effects;

CREATE TABLE public.site_popups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text,
  link_url text,
  link_label text,
  active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_popups TO anon, authenticated;
GRANT ALL ON public.site_popups TO service_role;
ALTER TABLE public.site_popups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Popups are public" ON public.site_popups FOR SELECT USING (active);
ALTER PUBLICATION supabase_realtime ADD TABLE public.site_popups;

CREATE TABLE public.live_visitors (
  session_id uuid PRIMARY KEY,
  label text NOT NULL DEFAULT 'Visitor',
  kind text NOT NULL DEFAULT 'guest',
  path text NOT NULL DEFAULT '/',
  user_id uuid,
  guest_id uuid,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.live_visitors TO service_role;
ALTER TABLE public.live_visitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Visitors are backend only" ON public.live_visitors FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE public.admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  label text NOT NULL DEFAULT 'Admin',
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_id uuid REFERENCES public.guests(id) ON DELETE CASCADE,
  revoked boolean NOT NULL DEFAULT false,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.admin_sessions TO service_role;
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin sessions backend only" ON public.admin_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Codex pets
CREATE TABLE public.pets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_id uuid REFERENCES public.guests(id) ON DELETE CASCADE,
  owner_name text NOT NULL DEFAULT 'Explorer',
  name text NOT NULL,
  species text NOT NULL DEFAULT 'nebula-cat',
  body_color text NOT NULL DEFAULT '#7dd3fc',
  accent_color text NOT NULL DEFAULT '#f0abfc',
  pattern text NOT NULL DEFAULT 'stars',
  aura text NOT NULL DEFAULT 'soft',
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pets_user_idx ON public.pets (user_id);
CREATE INDEX pets_guest_idx ON public.pets (guest_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pets TO authenticated;
GRANT SELECT ON public.pets TO anon;
GRANT ALL ON public.pets TO service_role;
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pets are viewable by everyone" ON public.pets FOR SELECT USING (true);
CREATE POLICY "Members manage own pets" ON public.pets FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER pets_set_updated_at BEFORE UPDATE ON public.pets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Events get redirects
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS redirect_url text,
  ADD COLUMN IF NOT EXISTS emoji text;

-- Guest RPCs
CREATE OR REPLACE FUNCTION public.guest_register(_name text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g public.guests;
BEGIN
  INSERT INTO public.guests (name) VALUES (coalesce(nullif(btrim(_name), ''), 'Guest Explorer'))
  RETURNING * INTO g;
  RETURN jsonb_build_object('id', g.id, 'name', g.name, 'space_tokens', g.space_tokens,
    'is_pro', g.is_pro, 'lifetime_pro', g.lifetime_pro, 'badge', g.badge, 'banned', g.banned);
END;
$$;

CREATE OR REPLACE FUNCTION public.guest_state(_guest_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g public.guests;
BEGIN
  UPDATE public.guests SET last_seen_at = now() WHERE id = _guest_id RETURNING * INTO g;
  IF NOT FOUND THEN RETURN jsonb_build_object('missing', true); END IF;
  RETURN jsonb_build_object('id', g.id, 'name', g.name, 'space_tokens', g.space_tokens,
    'is_pro', g.is_pro, 'lifetime_pro', g.lifetime_pro, 'badge', g.badge,
    'banned', g.banned, 'ban_reason', g.ban_reason, 'kicked_at', g.kicked_at);
END;
$$;

CREATE OR REPLACE FUNCTION public.guest_rename(_guest_id uuid, _name text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g public.guests;
BEGIN
  UPDATE public.guests SET name = coalesce(nullif(btrim(_name), ''), name)
  WHERE id = _guest_id AND NOT banned RETURNING * INTO g;
  IF NOT FOUND THEN RAISE EXCEPTION 'Guest account unavailable.'; END IF;
  RETURN jsonb_build_object('id', g.id, 'name', g.name);
END;
$$;

CREATE OR REPLACE FUNCTION public.guest_redeem_promo(_guest_id uuid, _code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.promo_codes; g public.guests; norm text := upper(btrim(_code));
BEGIN
  SELECT * INTO g FROM public.guests WHERE id = _guest_id AND NOT banned;
  IF NOT FOUND THEN RAISE EXCEPTION 'Guest account unavailable.'; END IF;
  SELECT * INTO c FROM public.promo_codes WHERE upper(code) = norm AND active;
  IF NOT FOUND THEN RAISE EXCEPTION 'That promo code is not valid.'; END IF;
  IF EXISTS (SELECT 1 FROM public.guest_promo_redemptions WHERE guest_id = _guest_id AND code = c.code) THEN
    RAISE EXCEPTION 'You have already used this promo code.';
  END IF;
  INSERT INTO public.guest_promo_redemptions (guest_id, code, tokens_awarded) VALUES (_guest_id, c.code, c.tokens);
  UPDATE public.guests SET space_tokens = space_tokens + c.tokens,
    is_pro = is_pro OR c.grants_pro, lifetime_pro = lifetime_pro OR c.lifetime,
    badge = coalesce(c.badge, badge)
  WHERE id = _guest_id RETURNING * INTO g;
  RETURN jsonb_build_object('code', c.code, 'tokens', c.tokens, 'balance', g.space_tokens,
    'pro', c.grants_pro, 'lifetime', c.lifetime, 'badge', c.badge);
END;
$$;

CREATE OR REPLACE FUNCTION public.post_lobby_message(_content text, _guest_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); nm text; body text := btrim(coalesce(_content, ''));
  banned text[] := ARRAY['fuck','shit','bitch','asshole','bastard','cunt','whore','slut','nigger','faggot','rape','kill yourself','kys','child porn','nudes','porn'];
  w text; row_id uuid;
BEGIN
  IF body = '' THEN RAISE EXCEPTION 'Message cannot be empty.'; END IF;
  IF length(body) > 1000 THEN RAISE EXCEPTION 'Message is too long (1000 characters max).'; END IF;
  FOREACH w IN ARRAY banned LOOP
    IF body ~* ('(^|[^a-z])' || w || '([^a-z]|$)') THEN
      RAISE EXCEPTION 'Message blocked by SSRA chat moderation.';
    END IF;
  END LOOP;
  IF uid IS NOT NULL THEN
    SELECT username INTO nm FROM public.profiles WHERE id = uid;
    INSERT INTO public.lobby_messages (user_id, author_name, content)
    VALUES (uid, coalesce(nm, 'Member'), body) RETURNING id INTO row_id;
  ELSE
    SELECT name INTO nm FROM public.guests WHERE id = _guest_id AND NOT banned;
    IF nm IS NULL THEN RAISE EXCEPTION 'Guest account unavailable.'; END IF;
    INSERT INTO public.lobby_messages (guest_id, author_name, content)
    VALUES (_guest_id, nm, body) RETURNING id INTO row_id;
  END IF;
  RETURN jsonb_build_object('id', row_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.track_visitor(_session_id uuid, _path text, _label text, _kind text, _guest_id uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.live_visitors (session_id, label, kind, path, user_id, guest_id, last_seen_at)
  VALUES (_session_id, coalesce(nullif(btrim(_label), ''), 'Visitor'), coalesce(_kind, 'guest'),
          coalesce(_path, '/'), auth.uid(), _guest_id, now())
  ON CONFLICT (session_id) DO UPDATE
    SET path = EXCLUDED.path, label = EXCLUDED.label, kind = EXCLUDED.kind,
        user_id = EXCLUDED.user_id, guest_id = EXCLUDED.guest_id, last_seen_at = now();
  DELETE FROM public.live_visitors WHERE last_seen_at < now() - interval '30 minutes';
END;
$$;

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
      enabled = coalesce((_pet->>'enabled')::boolean, enabled)
    WHERE id = pid AND ((uid IS NOT NULL AND user_id = uid) OR (_guest_id IS NOT NULL AND guest_id = _guest_id))
    RETURNING * INTO r;
    IF NOT FOUND THEN RAISE EXCEPTION 'Pet not found.'; END IF;
  ELSE
    INSERT INTO public.pets (user_id, guest_id, owner_name, name, species, body_color, accent_color, pattern, aura, enabled)
    VALUES (uid, _guest_id, coalesce(owner,'Explorer'), coalesce(nullif(_pet->>'name',''),'Nova'),
      coalesce(_pet->>'species','nebula-cat'), coalesce(_pet->>'body_color','#7dd3fc'),
      coalesce(_pet->>'accent_color','#f0abfc'), coalesce(_pet->>'pattern','stars'),
      coalesce(_pet->>'aura','soft'), coalesce((_pet->>'enabled')::boolean, true))
    RETURNING * INTO r;
  END IF;
  RETURN to_jsonb(r);
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_pet(_id uuid, _guest_id uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  DELETE FROM public.pets WHERE id = _id
    AND ((uid IS NOT NULL AND user_id = uid) OR (_guest_id IS NOT NULL AND guest_id = _guest_id));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guest_register(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.guest_state(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.guest_rename(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.guest_redeem_promo(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.post_lobby_message(text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.track_visitor(uuid, text, text, text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.save_pet(jsonb, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_pet(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guest_register(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.guest_state(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.guest_rename(uuid, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.guest_redeem_promo(uuid, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.post_lobby_message(text, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.track_visitor(uuid, text, text, text, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.save_pet(jsonb, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_pet(uuid, uuid) TO anon, authenticated, service_role;