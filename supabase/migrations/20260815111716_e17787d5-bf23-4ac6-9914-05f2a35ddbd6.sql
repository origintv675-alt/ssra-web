CREATE TABLE IF NOT EXISTS public.guest_task_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id uuid NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  task_id text NOT NULL,
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  tokens integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (guest_id, task_id, day)
);

GRANT SELECT ON public.guest_task_completions TO anon, authenticated;
GRANT ALL ON public.guest_task_completions TO service_role;

ALTER TABLE public.guest_task_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guest task completions are readable"
ON public.guest_task_completions FOR SELECT
TO anon, authenticated
USING (true);

CREATE OR REPLACE FUNCTION public.guest_complete_task(_guest_id uuid, _task_id text, _tokens integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  g public.guests%ROWTYPE;
  award integer := LEAST(GREATEST(COALESCE(_tokens, 0), 0), 1000);
BEGIN
  SELECT * INTO g FROM public.guests WHERE id = _guest_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Guest account not found.'); END IF;
  IF g.banned THEN RETURN jsonb_build_object('error', 'This guest account is banned.'); END IF;

  IF EXISTS (
    SELECT 1 FROM public.guest_task_completions
    WHERE guest_id = _guest_id AND task_id = _task_id AND day = (now() AT TIME ZONE 'utc')::date
  ) THEN
    RETURN jsonb_build_object('error', 'Task already claimed today.');
  END IF;

  INSERT INTO public.guest_task_completions (guest_id, task_id, tokens)
  VALUES (_guest_id, _task_id, award);

  UPDATE public.guests
     SET space_tokens = space_tokens + award
   WHERE id = _guest_id
  RETURNING * INTO g;

  RETURN jsonb_build_object('ok', true, 'tokens', award, 'balance', g.space_tokens);
END;
$$;

CREATE OR REPLACE FUNCTION public.guest_unlock_pro(_guest_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  g public.guests%ROWTYPE;
  cost integer := 6000;
BEGIN
  SELECT * INTO g FROM public.guests WHERE id = _guest_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Guest account not found.'); END IF;
  IF g.banned THEN RETURN jsonb_build_object('error', 'This guest account is banned.'); END IF;
  IF g.is_pro OR g.lifetime_pro THEN
    RETURN jsonb_build_object('ok', true, 'pro', true, 'balance', g.space_tokens);
  END IF;
  IF g.space_tokens < cost THEN
    RETURN jsonb_build_object('error', 'Not enough space tokens yet.');
  END IF;

  UPDATE public.guests
     SET space_tokens = space_tokens - cost, is_pro = true
   WHERE id = _guest_id
  RETURNING * INTO g;

  RETURN jsonb_build_object('ok', true, 'pro', true, 'balance', g.space_tokens);
END;
$$;

GRANT EXECUTE ON FUNCTION public.guest_complete_task(uuid, text, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guest_unlock_pro(uuid) TO anon, authenticated;