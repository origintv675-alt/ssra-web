create table if not exists public.site_themes (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete cascade,
  owner_guest_id uuid,
  owner_name text not null default 'Explorer',
  title text not null default 'My SSRA',
  hero_title text,
  hero_subtitle text,
  accent text not null default '#5cc8ff',
  glow text not null default '#c66bff',
  bg_style text not null default 'default',
  hero_image_url text,
  lock_enabled boolean not null default false,
  lock_media_url text,
  lock_media_type text not null default 'image',
  lock_message text,
  lock_code text,
  shared boolean not null default false,
  applied_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists site_themes_owner_user_idx on public.site_themes(owner_user_id) where owner_user_id is not null;
create unique index if not exists site_themes_owner_guest_idx on public.site_themes(owner_guest_id) where owner_guest_id is not null;

grant select, insert, update, delete on public.site_themes to authenticated;
grant all on public.site_themes to service_role;
alter table public.site_themes enable row level security;

drop policy if exists "Members manage own theme" on public.site_themes;
create policy "Members manage own theme" on public.site_themes for all to authenticated
  using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());

create or replace function public.save_site_theme(_theme jsonb, _guest_id uuid default null)
returns public.site_themes
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  row public.site_themes;
begin
  if uid is null and _guest_id is null then
    raise exception 'no owner';
  end if;

  update public.site_themes t set
    owner_name = coalesce(nullif(_theme->>'owner_name',''), t.owner_name),
    title = coalesce(nullif(_theme->>'title',''), t.title),
    hero_title = nullif(_theme->>'hero_title',''),
    hero_subtitle = nullif(_theme->>'hero_subtitle',''),
    accent = coalesce(nullif(_theme->>'accent',''), t.accent),
    glow = coalesce(nullif(_theme->>'glow',''), t.glow),
    bg_style = coalesce(nullif(_theme->>'bg_style',''), t.bg_style),
    hero_image_url = nullif(_theme->>'hero_image_url',''),
    lock_enabled = coalesce((_theme->>'lock_enabled')::boolean, t.lock_enabled),
    lock_media_url = nullif(_theme->>'lock_media_url',''),
    lock_media_type = coalesce(nullif(_theme->>'lock_media_type',''), t.lock_media_type),
    lock_message = nullif(_theme->>'lock_message',''),
    lock_code = nullif(_theme->>'lock_code',''),
    shared = coalesce((_theme->>'shared')::boolean, t.shared),
    updated_at = now()
  where (uid is not null and t.owner_user_id = uid)
     or (uid is null and t.owner_guest_id = _guest_id)
  returning t.* into row;

  if row.id is null then
    insert into public.site_themes (
      owner_user_id, owner_guest_id, owner_name, title, hero_title, hero_subtitle,
      accent, glow, bg_style, hero_image_url, lock_enabled, lock_media_url,
      lock_media_type, lock_message, lock_code, shared
    ) values (
      uid,
      case when uid is null then _guest_id else null end,
      coalesce(nullif(_theme->>'owner_name',''), 'Explorer'),
      coalesce(nullif(_theme->>'title',''), 'My SSRA'),
      nullif(_theme->>'hero_title',''),
      nullif(_theme->>'hero_subtitle',''),
      coalesce(nullif(_theme->>'accent',''), '#5cc8ff'),
      coalesce(nullif(_theme->>'glow',''), '#c66bff'),
      coalesce(nullif(_theme->>'bg_style',''), 'default'),
      nullif(_theme->>'hero_image_url',''),
      coalesce((_theme->>'lock_enabled')::boolean, false),
      nullif(_theme->>'lock_media_url',''),
      coalesce(nullif(_theme->>'lock_media_type',''), 'image'),
      nullif(_theme->>'lock_message',''),
      nullif(_theme->>'lock_code',''),
      coalesce((_theme->>'shared')::boolean, false)
    )
    returning * into row;
  end if;

  return row;
end;
$$;

create or replace function public.my_site_theme(_guest_id uuid default null)
returns public.site_themes
language sql
stable
security definer
set search_path = public
as $$
  select * from public.site_themes
  where (auth.uid() is not null and owner_user_id = auth.uid())
     or (auth.uid() is null and _guest_id is not null and owner_guest_id = _guest_id)
  limit 1;
$$;

create or replace function public.theme_cloud(_limit integer default 40)
returns table (
  id uuid, owner_name text, title text, hero_title text, hero_subtitle text,
  accent text, glow text, bg_style text, hero_image_url text, applied_count integer, updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select t.id, t.owner_name, t.title, t.hero_title, t.hero_subtitle, t.accent, t.glow, t.bg_style,
         t.hero_image_url, t.applied_count, t.updated_at
  from public.site_themes t
  where t.shared = true
  order by t.applied_count desc, t.updated_at desc
  limit greatest(1, least(coalesce(_limit, 40), 100));
$$;

create or replace function public.bump_theme_applied(_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.site_themes set applied_count = applied_count + 1 where id = _id and shared = true;
$$;

grant execute on function public.save_site_theme(jsonb, uuid) to anon, authenticated, service_role;
grant execute on function public.my_site_theme(uuid) to anon, authenticated, service_role;
grant execute on function public.theme_cloud(integer) to anon, authenticated, service_role;
grant execute on function public.bump_theme_applied(uuid) to anon, authenticated, service_role;

drop policy if exists "Anyone reads personal media" on storage.objects;
create policy "Anyone reads personal media" on storage.objects for select to anon, authenticated
  using (bucket_id = 'personal');

drop policy if exists "Anyone uploads personal media" on storage.objects;
create policy "Anyone uploads personal media" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'personal');