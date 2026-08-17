ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS accessory text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS eyes text NOT NULL DEFAULT 'round',
  ADD COLUMN IF NOT EXISTS size integer NOT NULL DEFAULT 64,
  ADD COLUMN IF NOT EXISTS personality text NOT NULL DEFAULT 'curious',
  ADD COLUMN IF NOT EXISTS trail text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS sparkle_color text NOT NULL DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS happiness integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS times_petted integer NOT NULL DEFAULT 0;

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
      accessory = coalesce(_pet->>'accessory', accessory),
      eyes = coalesce(_pet->>'eyes', eyes),
      size = least(greatest(coalesce((_pet->>'size')::integer, size), 32), 140),
      personality = coalesce(_pet->>'personality', personality),
      trail = coalesce(_pet->>'trail', trail),
      sparkle_color = coalesce(_pet->>'sparkle_color', sparkle_color),
      enabled = coalesce((_pet->>'enabled')::boolean, enabled)
    WHERE id = pid AND ((uid IS NOT NULL AND user_id = uid) OR (_guest_id IS NOT NULL AND guest_id = _guest_id))
    RETURNING * INTO r;
    IF NOT FOUND THEN RAISE EXCEPTION 'Pet not found.'; END IF;
  ELSE
    INSERT INTO public.pets (user_id, guest_id, owner_name, name, species, body_color, accent_color, pattern, aura,
      accessory, eyes, size, personality, trail, sparkle_color, enabled)
    VALUES (uid, _guest_id, coalesce(owner,'Explorer'), coalesce(nullif(_pet->>'name',''),'Nova'),
      coalesce(_pet->>'species','nebula-cat'), coalesce(_pet->>'body_color','#7dd3fc'),
      coalesce(_pet->>'accent_color','#f0abfc'), coalesce(_pet->>'pattern','stars'),
      coalesce(_pet->>'aura','soft'),
      coalesce(_pet->>'accessory','none'), coalesce(_pet->>'eyes','round'),
      least(greatest(coalesce((_pet->>'size')::integer, 64), 32), 140),
      coalesce(_pet->>'personality','curious'), coalesce(_pet->>'trail','none'),
      coalesce(_pet->>'sparkle_color','#ffffff'),
      coalesce((_pet->>'enabled')::boolean, true))
    RETURNING * INTO r;
  END IF;
  RETURN to_jsonb(r);
END;
$$;

DROP FUNCTION IF EXISTS public.guest_pets(uuid);
CREATE FUNCTION public.guest_pets(_guest_id uuid)
RETURNS TABLE (
  id uuid, name text, species text, body_color text, accent_color text,
  pattern text, aura text, enabled boolean, owner_name text,
  accessory text, eyes text, size integer, personality text, trail text,
  sparkle_color text, happiness integer, times_petted integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.name, p.species, p.body_color, p.accent_color,
         p.pattern, p.aura, p.enabled, p.owner_name,
         p.accessory, p.eyes, p.size, p.personality, p.trail,
         p.sparkle_color, p.happiness, p.times_petted
  FROM public.pets p
  WHERE _guest_id IS NOT NULL AND p.guest_id = _guest_id
  ORDER BY p.created_at ASC
$$;
REVOKE ALL ON FUNCTION public.guest_pets(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guest_pets(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.pet_the_pet(_id uuid, _guest_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); r public.pets;
BEGIN
  UPDATE public.pets SET
    happiness = least(happiness + 2, 100),
    times_petted = times_petted + 1
  WHERE id = _id
    AND ((uid IS NOT NULL AND user_id = uid) OR (_guest_id IS NOT NULL AND guest_id = _guest_id))
  RETURNING * INTO r;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pet not found.'; END IF;
  RETURN to_jsonb(r);
END;
$$;
REVOKE ALL ON FUNCTION public.pet_the_pet(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pet_the_pet(uuid, uuid) TO anon, authenticated, service_role;
