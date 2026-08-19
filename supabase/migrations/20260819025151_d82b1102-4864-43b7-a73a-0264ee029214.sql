alter table public.site_settings add column if not exists shutdown_from timestamptz;

create or replace function public.pet_cloud(_limit integer default 60)
returns table(id uuid, name text, species text, body_color text, accent_color text, pattern text, aura text, accessory text, eyes text, sparkle_color text, owner_name text, happiness integer, times_petted integer, created_at timestamptz)
language sql
stable
security definer
set search_path to 'public'
as $$
  select p.id, p.name, p.species, p.body_color, p.accent_color, p.pattern, p.aura,
         p.accessory, p.eyes, p.sparkle_color, p.owner_name, p.happiness, p.times_petted, p.created_at
  from public.pets p
  where p.enabled
  order by p.times_petted desc, p.created_at desc
  limit least(greatest(coalesce(_limit, 60), 1), 120)
$$;

grant execute on function public.pet_cloud(integer) to anon, authenticated;