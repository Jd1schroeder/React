create table if not exists public.organization_roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  description text check (description is null or char_length(description) <= 240),
  is_system boolean not null default false,
  system_key text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((is_system and system_key is not null) or (not is_system and system_key is null))
);

create unique index if not exists organization_roles_name_idx
  on public.organization_roles(organization_id, lower(name));

alter table public.organization_members
  add column if not exists role_id uuid references public.organization_roles(id) on delete set null;

alter table public.organization_roles enable row level security;

drop trigger if exists organization_roles_set_updated_at on public.organization_roles;
create trigger organization_roles_set_updated_at
before update on public.organization_roles
for each row execute function public.set_updated_at();

drop policy if exists "Members can view organization roles" on public.organization_roles;
create policy "Members can view organization roles"
  on public.organization_roles for select to authenticated
  using (exists (
    select 1 from public.organization_members
    where organization_members.organization_id = organization_roles.organization_id
      and organization_members.user_id = auth.uid()
      and organization_members.status = 'active'
  ));

drop policy if exists "Organization admins can create roles" on public.organization_roles;
create policy "Organization admins can create roles"
  on public.organization_roles for insert to authenticated
  with check (public.is_organization_admin(organization_id) and created_by = auth.uid() and is_system = false);

drop policy if exists "Organization admins can update roles" on public.organization_roles;
create policy "Organization admins can update roles"
  on public.organization_roles for update to authenticated
  using (public.is_organization_admin(organization_id) and is_system = false)
  with check (public.is_organization_admin(organization_id) and is_system = false);

drop policy if exists "Organization admins can delete roles" on public.organization_roles;
create policy "Organization admins can delete roles"
  on public.organization_roles for delete to authenticated
  using (public.is_organization_admin(organization_id) and is_system = false);
