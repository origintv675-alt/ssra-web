
DROP VIEW IF EXISTS public.member_directory;

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
