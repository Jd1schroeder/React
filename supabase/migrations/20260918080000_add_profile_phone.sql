alter table public.profiles
  add column if not exists phone text;

update public.profiles as profiles
set phone = nullif(btrim(auth_users.raw_user_meta_data ->> 'phone'), '')
from auth.users as auth_users
where auth_users.id = profiles.id
  and profiles.phone is null;

create or replace function public.provision_user_organization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  organization_id uuid;
  organization_name text := nullif(btrim(new.raw_user_meta_data ->> 'organization_name'), '');
begin
  insert into public.profiles (id, first_name, last_name, phone)
  values (
    new.id,
    nullif(btrim(new.raw_user_meta_data ->> 'first_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'last_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'phone'), '')
  )
  on conflict (id) do update
    set first_name = coalesce(public.profiles.first_name, excluded.first_name),
        last_name = coalesce(public.profiles.last_name, excluded.last_name),
        phone = coalesce(public.profiles.phone, excluded.phone);

  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  if organization_name is null then
    return new;
  end if;

  insert into public.organizations (name, created_by)
  values (organization_name, new.id)
  returning id into organization_id;

  insert into public.organization_members (organization_id, user_id, role, status, joined_at)
  values (organization_id, new.id, 'owner', 'active', now());

  return new;
end;
$$;
