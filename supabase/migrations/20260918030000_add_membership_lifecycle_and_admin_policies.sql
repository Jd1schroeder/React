alter table public.organization_members
  add column if not exists status text not null default 'active',
  add column if not exists invited_by uuid references auth.users(id) on delete set null,
  add column if not exists invited_at timestamptz,
  add column if not exists joined_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

update public.organization_members
set joined_at = coalesce(joined_at, created_at)
where status = 'active' and joined_at is null;

do $$
begin
  alter table public.organization_members
    add constraint organization_members_status_check
    check (status in ('invited', 'active', 'suspended'));
exception
  when duplicate_object then null;
end;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists organization_members_set_updated_at on public.organization_members;
create trigger organization_members_set_updated_at
before update on public.organization_members
for each row execute function public.set_updated_at();

create or replace function public.is_organization_admin(target_organization_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = target_organization_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
      and status = 'active'
  );
$$;

revoke execute on function public.is_organization_admin(uuid) from public;
grant execute on function public.is_organization_admin(uuid) to authenticated;

drop policy if exists "Members can view their organizations" on public.organizations;
create policy "Members can view their organizations"
  on public.organizations for select to authenticated
  using (exists (
    select 1
    from public.organization_members
    where organization_members.organization_id = organizations.id
      and organization_members.user_id = auth.uid()
      and organization_members.status = 'active'
  ));

drop policy if exists "Organization admins can update their organization" on public.organizations;
create policy "Organization admins can update their organization"
  on public.organizations for update to authenticated
  using (public.is_organization_admin(id))
  with check (public.is_organization_admin(id));

drop policy if exists "Members can view organization membership" on public.organization_members;
create policy "Members can view organization membership"
  on public.organization_members for select to authenticated
  using (user_id = auth.uid() or public.is_organization_admin(organization_id));

drop policy if exists "Organization admins can add members" on public.organization_members;
create policy "Organization admins can add members"
  on public.organization_members for insert to authenticated
  with check (public.is_organization_admin(organization_id));

drop policy if exists "Organization admins can update members" on public.organization_members;
create policy "Organization admins can update members"
  on public.organization_members for update to authenticated
  using (public.is_organization_admin(organization_id))
  with check (public.is_organization_admin(organization_id));

drop policy if exists "Organization admins can remove members" on public.organization_members;
create policy "Organization admins can remove members"
  on public.organization_members for delete to authenticated
  using (public.is_organization_admin(organization_id));

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

  insert into public.organization_members (organization_id, user_id, role, status, joined_at)
  values (organization_id, new.id, 'owner', 'active', now());

  return new;
end;
$$;
