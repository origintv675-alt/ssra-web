DROP FUNCTION IF EXISTS public.claim_rich_daily(uuid);
DROP FUNCTION IF EXISTS public.unlock_rich_with_tokens(uuid);
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS equipped_badges,
  DROP COLUMN IF EXISTS is_rich,
  DROP COLUMN IF EXISTS rich_reward_day;
ALTER TABLE public.guests
  DROP COLUMN IF EXISTS equipped_badges,
  DROP COLUMN IF EXISTS is_rich,
  DROP COLUMN IF EXISTS rich_reward_day;