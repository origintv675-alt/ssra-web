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

CREATE POLICY "Members upload their own chat media" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'community-media' AND (storage.foldername(name))[1] = (auth.uid())::text);
CREATE POLICY "Members read chat media" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'community-media');
CREATE POLICY "Members delete their own chat media" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'community-media' AND (storage.foldername(name))[1] = (auth.uid())::text);

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
