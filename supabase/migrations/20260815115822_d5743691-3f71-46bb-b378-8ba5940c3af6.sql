
-- 1. PROFILES: owner-only access to the full row
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Members can view their own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id);

-- Safe members directory for signed-in users (no tokens / pro_since)
CREATE OR REPLACE VIEW public.member_directory
WITH (security_invoker = false) AS
SELECT id, username, avatar_url, bio, badge, is_pro, created_at
FROM public.profiles;

REVOKE ALL ON public.member_directory FROM PUBLIC, anon;
GRANT SELECT ON public.member_directory TO authenticated;
GRANT ALL ON public.member_directory TO service_role;

-- 2. PETS: owner-only
DROP POLICY IF EXISTS "Pets are viewable by everyone" ON public.pets;

CREATE OR REPLACE FUNCTION public.guest_pets(_guest_id uuid)
RETURNS TABLE (
  id uuid, name text, species text, body_color text, accent_color text,
  pattern text, aura text, enabled boolean, owner_name text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.name, p.species, p.body_color, p.accent_color,
         p.pattern, p.aura, p.enabled, p.owner_name
  FROM public.pets p
  WHERE _guest_id IS NOT NULL AND p.guest_id = _guest_id
  ORDER BY p.created_at ASC
$$;
REVOKE ALL ON FUNCTION public.guest_pets(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guest_pets(uuid) TO anon, authenticated, service_role;

-- 3. LOBBY: no direct table reads; safe feed only
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

-- 4. Remove blanket PUBLIC execute rights left on helper functions
REVOKE ALL ON FUNCTION public.guest_complete_task(uuid, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guest_unlock_pro(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.moderate_direct_message() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guest_complete_task(uuid, text, integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.guest_unlock_pro(uuid) TO anon, authenticated, service_role;
