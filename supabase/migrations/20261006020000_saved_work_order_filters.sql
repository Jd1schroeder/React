create table if not exists public.work_order_saved_filters (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  filter_scope text not null check (filter_scope in ('personal', 'organization')),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  filters jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create unique index if not exists work_order_saved_filters_personal_name_idx
  on public.work_order_saved_filters (organization_id, created_by, lower(name))
  where filter_scope = 'personal';

create unique index if not exists work_order_saved_filters_organization_name_idx
  on public.work_order_saved_filters (organization_id, lower(name))
  where filter_scope = 'organization';

create index if not exists work_order_saved_filters_scope_idx
  on public.work_order_saved_filters (organization_id, filter_scope, name);

create or replace function public.enforce_work_order_saved_filter_integrity()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.name := btrim(new.name);
  if jsonb_typeof(new.filters) is distinct from 'array' then
    raise exception 'Saved Work Order filters must be an array';
  end if;
  if jsonb_array_length(new.filters) = 0 then
    raise exception 'At least one Work Order filter is required';
  end if;
  perform public.validate_work_order_inbox_filters(new.filters);

  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.created_at := now();
    new.updated_at := now();
    new.updated_by := auth.uid();
    return new;
  end if;

  if new.id is distinct from old.id
    or new.organization_id is distinct from old.organization_id
    or new.created_by is distinct from old.created_by
    or new.filter_scope is distinct from old.filter_scope
    or new.created_at is distinct from old.created_at then
    raise exception 'Saved Work Order filter ownership and scope cannot be changed';
  end if;

  return new;
end;
$$;

drop trigger if exists work_order_saved_filters_enforce_integrity on public.work_order_saved_filters;
create trigger work_order_saved_filters_enforce_integrity
before insert or update on public.work_order_saved_filters
for each row execute function public.enforce_work_order_saved_filter_integrity();

drop trigger if exists work_order_saved_filters_set_updated_at on public.work_order_saved_filters;
create trigger work_order_saved_filters_set_updated_at
before update on public.work_order_saved_filters
for each row execute function public.set_updated_at();

alter table public.work_order_saved_filters enable row level security;

revoke all on table public.work_order_saved_filters from public, anon, authenticated;
grant select, insert, update, delete on table public.work_order_saved_filters to authenticated;

drop policy if exists "Work Order viewers can read visible saved filters" on public.work_order_saved_filters;
create policy "Work Order viewers can read visible saved filters"
  on public.work_order_saved_filters for select to authenticated
  using (
    (
      (filter_scope = 'personal' and created_by = auth.uid())
      or filter_scope = 'organization'
    )
    and (
      public.has_organization_permission(organization_id, 'work_orders.view', 'assigned')
      or public.has_organization_permission(organization_id, 'work_orders.view', 'team')
      or public.has_organization_permission(organization_id, 'work_orders.view', 'any')
    )
  );

drop policy if exists "Members can save personal Work Order filters" on public.work_order_saved_filters;
create policy "Members can save personal Work Order filters"
  on public.work_order_saved_filters for insert to authenticated
  with check (
    filter_scope = 'personal'
    and created_by = auth.uid()
    and public.has_organization_permission(organization_id, 'work_orders.manage_saved_filters', 'any')
    and (
      public.has_organization_permission(organization_id, 'work_orders.view', 'assigned')
      or public.has_organization_permission(organization_id, 'work_orders.view', 'team')
      or public.has_organization_permission(organization_id, 'work_orders.view', 'any')
    )
  );

drop policy if exists "Organization admins can save shared Work Order filters" on public.work_order_saved_filters;
create policy "Organization admins can save shared Work Order filters"
  on public.work_order_saved_filters for insert to authenticated
  with check (
    filter_scope = 'organization'
    and public.is_organization_admin(organization_id)
    and public.has_organization_permission(organization_id, 'work_orders.manage_saved_filters', 'any')
    and (
      public.has_organization_permission(organization_id, 'work_orders.view', 'assigned')
      or public.has_organization_permission(organization_id, 'work_orders.view', 'team')
      or public.has_organization_permission(organization_id, 'work_orders.view', 'any')
    )
  );

drop policy if exists "Members can manage their personal Work Order filters" on public.work_order_saved_filters;
create policy "Members can manage their personal Work Order filters"
  on public.work_order_saved_filters for update to authenticated
  using (
    filter_scope = 'personal'
    and created_by = auth.uid()
    and public.has_organization_permission(organization_id, 'work_orders.manage_saved_filters', 'any')
    and (
      public.has_organization_permission(organization_id, 'work_orders.view', 'assigned')
      or public.has_organization_permission(organization_id, 'work_orders.view', 'team')
      or public.has_organization_permission(organization_id, 'work_orders.view', 'any')
    )
  )
  with check (
    filter_scope = 'personal'
    and created_by = auth.uid()
    and public.has_organization_permission(organization_id, 'work_orders.manage_saved_filters', 'any')
    and (
      public.has_organization_permission(organization_id, 'work_orders.view', 'assigned')
      or public.has_organization_permission(organization_id, 'work_orders.view', 'team')
      or public.has_organization_permission(organization_id, 'work_orders.view', 'any')
    )
  );

drop policy if exists "Organization admins can manage shared Work Order filters" on public.work_order_saved_filters;
create policy "Organization admins can manage shared Work Order filters"
  on public.work_order_saved_filters for update to authenticated
  using (
    filter_scope = 'organization'
    and public.is_organization_admin(organization_id)
    and public.has_organization_permission(organization_id, 'work_orders.manage_saved_filters', 'any')
    and (
      public.has_organization_permission(organization_id, 'work_orders.view', 'assigned')
      or public.has_organization_permission(organization_id, 'work_orders.view', 'team')
      or public.has_organization_permission(organization_id, 'work_orders.view', 'any')
    )
  )
  with check (
    filter_scope = 'organization'
    and public.is_organization_admin(organization_id)
    and public.has_organization_permission(organization_id, 'work_orders.manage_saved_filters', 'any')
    and (
      public.has_organization_permission(organization_id, 'work_orders.view', 'assigned')
      or public.has_organization_permission(organization_id, 'work_orders.view', 'team')
      or public.has_organization_permission(organization_id, 'work_orders.view', 'any')
    )
  );

drop policy if exists "Members can delete their personal Work Order filters" on public.work_order_saved_filters;
create policy "Members can delete their personal Work Order filters"
  on public.work_order_saved_filters for delete to authenticated
  using (
    filter_scope = 'personal'
    and created_by = auth.uid()
    and public.has_organization_permission(organization_id, 'work_orders.manage_saved_filters', 'any')
    and (
      public.has_organization_permission(organization_id, 'work_orders.view', 'assigned')
      or public.has_organization_permission(organization_id, 'work_orders.view', 'team')
      or public.has_organization_permission(organization_id, 'work_orders.view', 'any')
    )
  );

drop policy if exists "Organization admins can delete shared Work Order filters" on public.work_order_saved_filters;
create policy "Organization admins can delete shared Work Order filters"
  on public.work_order_saved_filters for delete to authenticated
  using (
    filter_scope = 'organization'
    and public.is_organization_admin(organization_id)
    and public.has_organization_permission(organization_id, 'work_orders.manage_saved_filters', 'any')
    and (
      public.has_organization_permission(organization_id, 'work_orders.view', 'assigned')
      or public.has_organization_permission(organization_id, 'work_orders.view', 'team')
      or public.has_organization_permission(organization_id, 'work_orders.view', 'any')
    )
  );

-- Existing roles that can view Work Orders receive personal-filter saving by default.
insert into public.organization_role_permissions (role_id, permission_key, scope)
select roles.id, 'work_orders.manage_saved_filters', 'any'
from public.organization_roles roles
where exists (
  select 1 from public.organization_role_permissions view_grant
  where view_grant.role_id = roles.id
    and view_grant.permission_key = 'work_orders.view'
)
on conflict (role_id, permission_key) do nothing;

-- System roles for new organizations are created by a privileged provisioning function.
-- Grant the action as the role is inserted; requester roles intentionally receive none.
create or replace function public.grant_saved_filter_permission_to_work_order_system_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_system and new.system_key in ('technician', 'supervisor', 'organization_admin') then
    insert into public.organization_role_permissions (role_id, permission_key, scope)
    values (new.id, 'work_orders.manage_saved_filters', 'any')
    on conflict (role_id, permission_key) do nothing;
  end if;
  return new;
end;
$$;

revoke all on function public.grant_saved_filter_permission_to_work_order_system_role() from public, anon, authenticated;
drop trigger if exists organization_roles_grant_saved_filter_permission on public.organization_roles;
create trigger organization_roles_grant_saved_filter_permission
after insert on public.organization_roles
for each row execute function public.grant_saved_filter_permission_to_work_order_system_role();

notify pgrst, 'reload schema';
