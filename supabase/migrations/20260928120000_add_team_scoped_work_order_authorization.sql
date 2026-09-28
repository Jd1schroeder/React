-- Add the minimum team model required for team-scoped Work Order access.
-- Team membership is organization-scoped and remains subordinate to role grants.

create table if not exists public.organization_teams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists organization_teams_name_idx
  on public.organization_teams(organization_id, lower(name));

create table if not exists public.organization_team_members (
  team_id uuid not null references public.organization_teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create index if not exists organization_team_members_user_idx
  on public.organization_team_members(user_id, team_id);

alter table public.organization_teams enable row level security;
alter table public.organization_team_members enable row level security;

drop trigger if exists organization_teams_set_updated_at on public.organization_teams;
create trigger organization_teams_set_updated_at
before update on public.organization_teams
for each row execute function public.set_updated_at();

drop policy if exists "Members can view organization teams" on public.organization_teams;
create policy "Members can view organization teams"
  on public.organization_teams for select to authenticated
  using (exists (
    select 1
    from public.organization_members members
    where members.organization_id = organization_teams.organization_id
      and members.user_id = auth.uid()
      and members.status = 'active'
  ));

drop policy if exists "Authorized members can create organization teams" on public.organization_teams;
create policy "Authorized members can create organization teams"
  on public.organization_teams for insert to authenticated
  with check (
    public.has_organization_permission(organization_id, 'organization.edit_user_roles')
    and created_by = auth.uid()
  );

drop policy if exists "Authorized members can update organization teams" on public.organization_teams;
create policy "Authorized members can update organization teams"
  on public.organization_teams for update to authenticated
  using (public.has_organization_permission(organization_id, 'organization.edit_user_roles'))
  with check (public.has_organization_permission(organization_id, 'organization.edit_user_roles'));

drop policy if exists "Authorized members can delete organization teams" on public.organization_teams;
create policy "Authorized members can delete organization teams"
  on public.organization_teams for delete to authenticated
  using (public.has_organization_permission(organization_id, 'organization.edit_user_roles'));

drop policy if exists "Members can view team membership" on public.organization_team_members;
create policy "Members can view team membership"
  on public.organization_team_members for select to authenticated
  using (exists (
    select 1
    from public.organization_teams teams
    join public.organization_members members on members.organization_id = teams.organization_id
    where teams.id = organization_team_members.team_id
      and members.user_id = auth.uid()
      and members.status = 'active'
  ));

drop policy if exists "Authorized members can add team membership" on public.organization_team_members;
create policy "Authorized members can add team membership"
  on public.organization_team_members for insert to authenticated
  with check (
    public.has_organization_permission((select organization_id from public.organization_teams where id = organization_team_members.team_id), 'organization.edit_user_roles')
    and exists (
      select 1
      from public.organization_teams teams
      join public.organization_members members on members.organization_id = teams.organization_id
      where teams.id = organization_team_members.team_id
        and members.user_id = organization_team_members.user_id
        and members.status = 'active'
    )
  );

drop policy if exists "Authorized members can remove team membership" on public.organization_team_members;
create policy "Authorized members can remove team membership"
  on public.organization_team_members for delete to authenticated
  using (public.has_organization_permission((select organization_id from public.organization_teams where id = organization_team_members.team_id), 'organization.edit_user_roles'));

alter table public.work_orders
  add column if not exists team_id uuid references public.organization_teams(id) on delete set null;

create index if not exists work_orders_team_idx
  on public.work_orders(organization_id, team_id);

create or replace function public.has_organization_work_order_permission(
  target_organization_id uuid,
  target_permission_key text,
  record_owner_id uuid default null,
  record_assignee_id uuid default null,
  record_team_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members members
    join public.organizations organizations on organizations.id = members.organization_id
      and organizations.status = 'active'
    join public.organization_role_permissions grants on grants.role_id = members.role_id
    where members.organization_id = target_organization_id
      and members.user_id = auth.uid()
      and members.status = 'active'
      and grants.permission_key = target_permission_key
      and (
        grants.scope = 'any'
        or (grants.scope = 'own' and record_owner_id = auth.uid())
        or (grants.scope = 'assigned' and record_assignee_id = auth.uid())
        or (grants.scope = 'team' and exists (
          select 1
          from public.organization_teams teams
          join public.organization_team_members team_members on team_members.team_id = teams.id
          where teams.id = record_team_id
            and teams.organization_id = target_organization_id
            and team_members.user_id = auth.uid()
        ))
      )
  );
$$;

revoke execute on function public.has_organization_work_order_permission(uuid, text, uuid, uuid, uuid) from public;
grant execute on function public.has_organization_work_order_permission(uuid, text, uuid, uuid, uuid) to authenticated;

-- The old boolean team flag was caller-controlled. Retain the function for
-- migration compatibility, but remove its direct execution surface and stop
-- using it for Work Orders.
revoke execute on function public.has_organization_record_permission(uuid, text, uuid, uuid, boolean) from public, authenticated;

create or replace function public.validate_work_order_team()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.team_id is not null and not exists (
    select 1
    from public.organization_teams teams
    where teams.id = new.team_id
      and teams.organization_id = new.organization_id
  ) then
    raise exception 'Work Order team must belong to the Work Order organization';
  end if;
  return new;
end;
$$;

drop trigger if exists work_orders_validate_team on public.work_orders;
create trigger work_orders_validate_team
before insert or update on public.work_orders
for each row execute function public.validate_work_order_team();

create or replace function public.enforce_work_order_permissions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then return new; end if;
  if old.organization_id is distinct from new.organization_id then
    raise exception 'Work Order organization cannot be changed';
  end if;

  if old.title is distinct from new.title
    or old.description is distinct from new.description
    or old.priority is distinct from new.priority
    or old.due_at is distinct from new.due_at
    or old.requester_id is distinct from new.requester_id
    or old.assigned_to is distinct from new.assigned_to
    or old.team_id is distinct from new.team_id then
    if not (
      public.has_organization_work_order_permission(old.organization_id, 'work_orders.edit', old.created_by, old.assigned_to, old.team_id)
      or public.has_organization_work_order_permission(old.organization_id, 'work_orders.assign', old.created_by, old.assigned_to, new.team_id)
    ) then
      raise exception 'You do not have permission to edit or assign this Work Order';
    end if;
  end if;

  if old.status is distinct from new.status
    and not public.has_organization_work_order_permission(old.organization_id, 'work_orders.change_status', old.created_by, old.assigned_to, old.team_id) then
    raise exception 'You do not have permission to change Work Order status';
  end if;

  if old.procedure_progress is distinct from new.procedure_progress
    and not public.has_organization_work_order_permission(old.organization_id, 'work_orders.fill_procedure', old.created_by, old.assigned_to, old.team_id) then
    raise exception 'You do not have permission to update procedure progress';
  end if;

  new.updated_by = auth.uid();
  return new;
end;
$$;

drop policy if exists "Members can view permitted work orders" on public.work_orders;
create policy "Members can view permitted work orders"
  on public.work_orders for select to authenticated
  using (public.has_organization_work_order_permission(organization_id, 'work_orders.view', created_by, assigned_to, team_id));

drop policy if exists "Members can update permitted work orders" on public.work_orders;
create policy "Members can update permitted work orders"
  on public.work_orders for update to authenticated
  using (
    public.has_organization_work_order_permission(organization_id, 'work_orders.edit', created_by, assigned_to, team_id)
    or public.has_organization_work_order_permission(organization_id, 'work_orders.change_status', created_by, assigned_to, team_id)
    or public.has_organization_work_order_permission(organization_id, 'work_orders.fill_procedure', created_by, assigned_to, team_id)
    or public.has_organization_work_order_permission(organization_id, 'work_orders.assign', created_by, assigned_to, team_id)
  )
  with check (
    public.has_organization_work_order_permission(organization_id, 'work_orders.edit', created_by, assigned_to, team_id)
    or public.has_organization_work_order_permission(organization_id, 'work_orders.change_status', created_by, assigned_to, team_id)
    or public.has_organization_work_order_permission(organization_id, 'work_orders.fill_procedure', created_by, assigned_to, team_id)
    or public.has_organization_work_order_permission(organization_id, 'work_orders.assign', created_by, assigned_to, team_id)
  );

drop policy if exists "Members can delete permitted work orders" on public.work_orders;
create policy "Members can delete permitted work orders"
  on public.work_orders for delete to authenticated
  using (public.has_organization_work_order_permission(organization_id, 'work_orders.delete', created_by, assigned_to, team_id));

select 'team-scoped Work Order authorization installed' as result;
