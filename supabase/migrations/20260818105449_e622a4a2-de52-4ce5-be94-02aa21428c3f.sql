alter table public.profiles add column if not exists banned_until timestamptz;
alter table public.guests add column if not exists banned_until timestamptz;
alter table public.banned_ips add column if not exists expires_at timestamptz;
alter table public.haunts add column if not exists ban_type text not null default 'ip';