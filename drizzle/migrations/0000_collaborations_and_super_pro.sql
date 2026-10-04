CREATE TABLE public.collaborations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  eyebrow text NOT NULL DEFAULT 'Collaboration',
  description text NOT NULL DEFAULT '',
  href text,
  action_label text NOT NULL DEFAULT 'Open project',
  dates text,
  note text,
  status text NOT NULL DEFAULT 'active',
  style text NOT NULL DEFAULT 'default',
  dare_text text,
  dare_href text,
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.collaborations TO anon, authenticated;
GRANT ALL ON public.collaborations TO service_role;
ALTER TABLE public.collaborations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read collaborations" ON public.collaborations FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.collaborations (title, eyebrow, description, href, action_label, dates, note, status, style, dare_text, dare_href, sort_order) VALUES
('SSRA × Virgin Galactic','Past collaboration','A Virgin Galactic ticket giveaway for one lucky winner in our WhatsApp group.','https://chat.whatsapp.com/G5zZm3WobSg8KEHLarmXwx','Join for future giveaways','25 December 2025 — 30 July 2026','Even though this giveaway has closed, join our group now for future promotional offers and giveaways.','closed','virgin',NULL,NULL,10),
('SSRA OriginTV','Smart TV project','Many people do not enjoy the operating system built into their smart TV, including platforms such as Tizen OS. OriginTV is our website-based TV system for everyone, with daily security updates and much more.','https://origintv.lovable.app','Open OriginTV',NULL,NULL,'active','default','Want to visit first version? It contains many lag and non workable things! If you dare visit it!','https://fep-otv.lovable.app',20),
('SSRA × NEUprint','Open-source simulation','Together with Neuprint, we built an open-source fly-brain simulator with almost every neuron activated, including systems for sight, touch, smell and more. Accessible to anyone, this simulation can run in the background forever and even runs under 64 kilobytes per second — under 2 MB per hour.','https://flyrevival.lovable.app','Explore Fly Revival',NULL,NULL,'active','default',NULL,NULL,30),
('SSRA × ASUS ROG','Experimental computing','We and ASUS ROG collaborated to make the world''s first online CPU, managing to reach up to 5 GHz, with online RAM and online SSD storage. Try our small mini game while we make our technology more advanced day by day. Future updates aim to expand the virtual SSD to a lot more (up to 2 TB), and RAM too — you can even write on paper and use it as RAM!','https://nightcity2077.lovable.app','Try the experiment',NULL,NULL,'active','rgb',NULL,NULL,40),
('SSRA × NASA','Experimental — in beta','Spaceos is our experimental operating system for satellites, built as a collaboration between SSRA and NASA. It will be offered to major spacecraft and satellite companies. Keep in mind: the website preview of the OS and the actual OS are actually a lot different. And it gets under 0.05 MB per hour.','https://spaceospreview.lovable.app','Preview Spaceos',NULL,NULL,'beta','nasa',NULL,NULL,50);

ALTER TABLE public.profiles ADD COLUMN super_pro boolean NOT NULL DEFAULT false, ADD COLUMN super_reward_day date;
ALTER TABLE public.guests ADD COLUMN super_pro boolean NOT NULL DEFAULT false, ADD COLUMN super_reward_day date;

CREATE OR REPLACE FUNCTION public.guard_super_pro() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated','anon') AND (NEW.super_pro IS DISTINCT FROM OLD.super_pro OR NEW.super_reward_day IS DISTINCT FROM OLD.super_reward_day) THEN
    RAISE EXCEPTION 'Super Pro can only change through the Pro page';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER profiles_guard_super_pro BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.guard_super_pro();

CREATE OR REPLACE FUNCTION public.unlock_super_pro_with_tokens() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.profiles;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('error','Sign in first.'); END IF;
  SELECT * INTO r FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','Profile not found.'); END IF;
  IF r.super_pro THEN RETURN jsonb_build_object('error','Super Pro is already active.'); END IF;
  IF r.space_tokens < 20000 THEN RETURN jsonb_build_object('error','You need 20,000 space tokens.'); END IF;
  UPDATE public.profiles SET space_tokens = space_tokens - 20000, super_pro = true, is_pro = true WHERE id = r.id;
  RETURN jsonb_build_object('ok',true,'balance',r.space_tokens - 20000);
END $$;

CREATE OR REPLACE FUNCTION public.claim_super_pro_daily() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.profiles;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('error','Sign in first.'); END IF;
  SELECT * INTO r FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
  IF NOT FOUND OR NOT r.super_pro THEN RETURN jsonb_build_object('error','Super Pro is not active.'); END IF;
  IF r.super_reward_day = current_date THEN RETURN jsonb_build_object('error','Already claimed today — come back tomorrow.'); END IF;
  UPDATE public.profiles SET space_tokens = space_tokens + 150, super_reward_day = current_date WHERE id = r.id;
  RETURN jsonb_build_object('ok',true,'balance',r.space_tokens + 150);
END $$;

CREATE OR REPLACE FUNCTION public.guest_super_state(_guest_id uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object('super_pro', coalesce(g.super_pro,false), 'claimed_today', g.super_reward_day = current_date)
  FROM public.guests g WHERE g.id = _guest_id
$$;

CREATE OR REPLACE FUNCTION public.guest_unlock_super_pro(_guest_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g public.guests;
BEGIN
  SELECT * INTO g FROM public.guests WHERE id = _guest_id FOR UPDATE;
  IF NOT FOUND OR g.banned THEN RETURN jsonb_build_object('error','Guest account not available.'); END IF;
  IF g.super_pro THEN RETURN jsonb_build_object('error','Super Pro is already active.'); END IF;
  IF g.space_tokens < 20000 THEN RETURN jsonb_build_object('error','You need 20,000 space tokens.'); END IF;
  UPDATE public.guests SET space_tokens = space_tokens - 20000, super_pro = true, is_pro = true WHERE id = g.id;
  RETURN jsonb_build_object('ok',true,'balance',g.space_tokens - 20000);
END $$;

CREATE OR REPLACE FUNCTION public.guest_claim_super_pro_daily(_guest_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g public.guests;
BEGIN
  SELECT * INTO g FROM public.guests WHERE id = _guest_id FOR UPDATE;
  IF NOT FOUND OR g.banned OR NOT g.super_pro THEN RETURN jsonb_build_object('error','Super Pro is not active.'); END IF;
  IF g.super_reward_day = current_date THEN RETURN jsonb_build_object('error','Already claimed today — come back tomorrow.'); END IF;
  UPDATE public.guests SET space_tokens = space_tokens + 150, super_reward_day = current_date WHERE id = g.id;
  RETURN jsonb_build_object('ok',true,'balance',g.space_tokens + 150);
END $$;

REVOKE ALL ON FUNCTION public.unlock_super_pro_with_tokens(), public.claim_super_pro_daily() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unlock_super_pro_with_tokens(), public.claim_super_pro_daily() TO authenticated;
GRANT EXECUTE ON FUNCTION public.guest_super_state(uuid), public.guest_unlock_super_pro(uuid), public.guest_claim_super_pro_daily(uuid) TO anon, authenticated;