alter table public.organizations
  add column if not exists slug text,
  add column if not exists description text,
  add column if not exists logo_url text,
  add column if not exists timezone text not null default 'America/New_York',
  add column if not exists status text not null default 'active',
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  alter table public.organizations
    add constraint organizations_status_check
    check (status in ('active', 'suspended'));
exception
  when duplicate_object then null;
end;
$$;

create unique index if not exists organizations_slug_unique_idx
  on public.organizations(lower(slug))
  where slug is not null;

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

create or replace function public.is_organization_owner(target_organization_id uuid)
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
      and role = 'owner'
      and status = 'active'
  );
$$;

revoke execute on function public.is_organization_owner(uuid) from public;
grant execute on function public.is_organization_owner(uuid) to authenticated;

create or replace function public.protect_organization_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if old.organization_id <> new.organization_id or old.user_id <> new.user_id then
      raise exception 'Membership organization and user cannot be changed';
    end if;

    if old.role = 'owner'
      and auth.uid() is not null
      and not public.is_organization_owner(old.organization_id) then
      raise exception 'Only an organization owner can change an owner membership';
    end if;

    if old.role = 'owner'
      and (new.role <> 'owner' or new.status <> 'active')
      and not exists (
        select 1
        from public.organization_members
        where organization_id = old.organization_id
          and user_id <> old.user_id
          and role = 'owner'
          and status = 'active'
      ) then
      raise exception 'An organization must retain an active owner';
    end if;

    return new;
  end if;

  if tg_op = 'DELETE'
    and old.role = 'owner'
    and not exists (
      select 1
      from public.organization_members
      where organization_id = old.organization_id
        and user_id <> old.user_id
        and role = 'owner'
        and status = 'active'
    ) then
    raise exception 'An organization must retain an active owner';
  end if;

  return old;
end;
$$;

drop trigger if exists protect_organization_membership on public.organization_members;
create trigger protect_organization_membership
before update or delete on public.organization_members
for each row execute function public.protect_organization_membership();

drop policy if exists "Organization admins can view member profiles" on public.profiles;
create policy "Organization admins can view member profiles"
  on public.profiles for select to authenticated
  using (exists (
    select 1
    from public.organization_members
    where organization_members.user_id = profiles.id
      and public.is_organization_admin(organization_members.organization_id)
  ));

create table if not exists public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contact_type text not null check (contact_type in ('email', 'phone')),
  contact_value text not null check (char_length(btrim(contact_value)) between 3 and 320),
  first_name text,
  last_name text,
  role text not null default 'member' check (role in ('admin', 'member')),
  status text not null default 'invited' check (status in ('invited', 'accepted', 'revoked', 'expired')),
  token_hash text unique,
  invited_by uuid not null references auth.users(id) on delete restrict,
  invited_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists organization_invitations_pending_contact_idx
  on public.organization_invitations(organization_id, contact_type, lower(contact_value))
  where status = 'invited';

alter table public.organization_invitations enable row level security;

drop trigger if exists organization_invitations_set_updated_at on public.organization_invitations;
create trigger organization_invitations_set_updated_at
before update on public.organization_invitations
for each row execute function public.set_updated_at();

drop policy if exists "Organization admins can view invitations" on public.organization_invitations;
create policy "Organization admins can view invitations"
  on public.organization_invitations for select to authenticated
  using (public.is_organization_admin(organization_id));

drop policy if exists "Organization admins can create invitations" on public.organization_invitations;
create policy "Organization admins can create invitations"
  on public.organization_invitations for insert to authenticated
  with check (public.is_organization_admin(organization_id) and invited_by = auth.uid());

drop policy if exists "Organization admins can update invitations" on public.organization_invitations;
create policy "Organization admins can update invitations"
  on public.organization_invitations for update to authenticated
  using (public.is_organization_admin(organization_id))
  with check (public.is_organization_admin(organization_id));

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null check (char_length(btrim(action)) between 1 and 100),
  entity_type text not null check (char_length(btrim(entity_type)) between 1 and 100),
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_events_organization_created_idx
  on public.audit_events(organization_id, created_at desc);

alter table public.audit_events enable row level security;

drop policy if exists "Organization admins can view audit events" on public.audit_events;
create policy "Organization admins can view audit events"
  on public.audit_events for select to authenticated
  using (public.is_organization_admin(organization_id));

drop policy if exists "Organization admins can create audit events" on public.audit_events;
create policy "Organization admins can create audit events"
  on public.audit_events for insert to authenticated
  with check (public.is_organization_admin(organization_id) and actor_id = auth.uid());
