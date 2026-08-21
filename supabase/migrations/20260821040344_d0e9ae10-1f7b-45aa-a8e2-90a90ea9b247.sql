-- Public, anonymised cloud of "last words" left during punishments
CREATE OR REPLACE FUNCTION public.confession_cloud(_limit integer DEFAULT 60)
RETURNS TABLE (id uuid, label text, words text, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id,
         COALESCE(NULLIF(c.label, ''), 'anonymous') AS label,
         c.words,
         c.created_at
  FROM public.haunt_confessions c
  WHERE c.words IS NOT NULL AND length(trim(c.words)) > 0
  ORDER BY c.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(_limit, 60), 1), 200);
$$;

GRANT EXECUTE ON FUNCTION public.confession_cloud(integer) TO anon, authenticated, service_role;

-- Let a member or guest delete their own saved theme
CREATE OR REPLACE FUNCTION public.delete_my_site_theme(_guest_id text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NOT NULL THEN
    DELETE FROM public.site_themes WHERE owner_user_id = _uid;
  ELSIF _guest_id IS NOT NULL THEN
    DELETE FROM public.site_themes WHERE owner_guest_id = _guest_id;
  ELSE
    RETURN false;
  END IF;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_my_site_theme(text) TO anon, authenticated, service_role;