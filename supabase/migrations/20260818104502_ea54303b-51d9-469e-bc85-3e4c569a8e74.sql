
ALTER TABLE public.haunts ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'full';
ALTER TABLE public.site_popups ADD COLUMN IF NOT EXISTS target_session_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS page_locks_sitewide_path_idx ON public.page_locks (path) WHERE target_user_id IS NULL AND target_guest_id IS NULL;

CREATE TABLE IF NOT EXISTS public.haunt_confessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  haunt_id uuid,
  label text,
  words text NOT NULL,
  ip text,
  email text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.haunt_confessions TO service_role;
ALTER TABLE public.haunt_confessions ENABLE ROW LEVEL SECURITY;
