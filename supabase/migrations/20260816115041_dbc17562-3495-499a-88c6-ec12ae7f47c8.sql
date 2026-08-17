REVOKE ALL ON FUNCTION public.post_lobby_message(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guest_state(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_direct_message() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.post_lobby_message(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guest_state(uuid) TO anon, authenticated;