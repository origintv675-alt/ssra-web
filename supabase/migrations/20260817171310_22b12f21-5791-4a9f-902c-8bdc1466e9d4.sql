CREATE TABLE public.haunts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid,
  target_guest_id uuid,
  target_session_id uuid,
  target_ip text,
  origin_path text,
  stage text NOT NULL DEFAULT 'armed',
  ruined boolean NOT NULL DEFAULT false,
  banned boolean NOT NULL DEFAULT false,
  created_by text NOT NULL DEFAULT 'Mission control',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX haunts_user_idx ON public.haunts (target_user_id);
CREATE INDEX haunts_guest_idx ON public.haunts (target_guest_id);
CREATE INDEX haunts_session_idx ON public.haunts (target_session_id);
CREATE INDEX haunts_ip_idx ON public.haunts (target_ip);
GRANT ALL ON public.haunts TO service_role;
ALTER TABLE public.haunts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Haunts backend only" ON public.haunts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE TRIGGER haunts_set_updated_at BEFORE UPDATE ON public.haunts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();