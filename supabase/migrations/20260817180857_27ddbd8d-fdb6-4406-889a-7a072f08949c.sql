DELETE FROM public.banned_ips;
UPDATE public.guests SET banned = false, ban_reason = NULL WHERE banned = true;
UPDATE public.profiles SET banned = false, ban_reason = NULL WHERE banned = true;
DELETE FROM public.haunts;