REVOKE EXECUTE ON FUNCTION public.complete_daily_task(text, bigint) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.redeem_promo_code(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.unlock_pro_with_tokens() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.increment_counter(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_counter(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_daily_task(text, bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_promo_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unlock_pro_with_tokens() TO authenticated;