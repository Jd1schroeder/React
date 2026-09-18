create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 200),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

drop policy if exists "Members can view their organizations" on public.organizations;
create policy "Members can view their organizations"
  on public.organizations for select to authenticated
  using (exists (select 1 from public.organization_members where organization_members.organization_id = organizations.id and organization_members.user_id = auth.uid()));

drop policy if exists "Members can view organization membership" on public.organization_members;
create policy "Members can view organization membership"
  on public.organization_members for select to authenticated
  using (user_id = auth.uid());

create or replace function public.provision_user_organization()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  organization_id uuid;
  organization_name text := nullif(btrim(new.raw_user_meta_data ->> 'organization_name'), '');
begin
  if organization_name is null then return new; end if;
  insert into public.organizations (name, created_by) values (organization_name, new.id) returning id into organization_id;
  insert into public.organization_members (organization_id, user_id, role) values (organization_id, new.id, 'owner');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.provision_user_organization();
