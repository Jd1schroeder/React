create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  language text not null default 'English',
  date_format text not null default 'MM/DD/YYYY',
  time_format text not null default '11:59 PM',
  week_start text not null default 'Sunday',
  timezone text not null default 'America/New_York',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_preferences_date_format_check check (date_format in ('MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD')),
  constraint user_preferences_time_format_check check (time_format in ('11:59 PM', '23:59')),
  constraint user_preferences_week_start_check check (week_start in ('Sunday', 'Monday'))
);

insert into public.profiles (id, first_name, last_name)
select
  id,
  nullif(btrim(raw_user_meta_data ->> 'first_name'), ''),
  nullif(btrim(raw_user_meta_data ->> 'last_name'), '')
from auth.users
on conflict (id) do nothing;

insert into public.user_preferences (user_id)
select id from auth.users
on conflict (user_id) do nothing;

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;

drop policy if exists "Users can view their profile" on public.profiles;
create policy "Users can view their profile"
  on public.profiles for select to authenticated
  using (id = auth.uid());

drop policy if exists "Users can insert their profile" on public.profiles;
create policy "Users can insert their profile"
  on public.profiles for insert to authenticated
  with check (id = auth.uid());

drop policy if exists "Users can update their profile" on public.profiles;
create policy "Users can update their profile"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "Users can view their preferences" on public.user_preferences;
create policy "Users can view their preferences"
  on public.user_preferences for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can insert their preferences" on public.user_preferences;
create policy "Users can insert their preferences"
  on public.user_preferences for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can update their preferences" on public.user_preferences;
create policy "Users can update their preferences"
  on public.user_preferences for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create or replace function public.provision_user_organization()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  organization_id uuid;
  organization_name text := nullif(btrim(new.raw_user_meta_data ->> 'organization_name'), '');
begin
  insert into public.profiles (id, first_name, last_name)
  values (
    new.id,
    nullif(btrim(new.raw_user_meta_data ->> 'first_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'last_name'), '')
  )
  on conflict (id) do nothing;

  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  if organization_name is null then return new; end if;

  insert into public.organizations (name, created_by)
  values (organization_name, new.id)
  returning id into organization_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (organization_id, new.id, 'owner');

  return new;
end;
$$;
