create table if not exists public.work_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  description text,
  status text not null default 'Open' check (status in ('Open', 'In Progress', 'On Hold', 'Completed', 'Cancelled', 'Skipped')),
  priority text not null default 'Medium' check (priority in ('Low', 'Medium', 'High', 'Urgent')),
  procedure_progress integer not null default 0 check (procedure_progress between 0 and 100),
  due_at timestamptz,
  requester_id uuid references auth.users(id) on delete set null,
  assigned_to uuid references auth.users(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create index if not exists work_orders_organization_idx on public.work_orders(organization_id, created_at desc);
create index if not exists work_orders_assignee_idx on public.work_orders(organization_id, assigned_to);
create index if not exists work_orders_creator_idx on public.work_orders(organization_id, created_by);

alter table public.work_orders enable row level security;

drop trigger if exists work_orders_set_updated_at on public.work_orders;
create trigger work_orders_set_updated_at
before update on public.work_orders
for each row execute function public.set_updated_at();

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
    or old.assigned_to is distinct from new.assigned_to then
    if not public.has_organization_record_permission(old.organization_id, 'work_orders.edit', old.created_by, old.assigned_to, false) then
      raise exception 'You do not have permission to edit core Work Order details';
    end if;
  end if;

  if old.status is distinct from new.status
    and not public.has_organization_record_permission(old.organization_id, 'work_orders.change_status', old.created_by, old.assigned_to, false) then
    raise exception 'You do not have permission to change Work Order status';
  end if;

  if old.procedure_progress is distinct from new.procedure_progress
    and not public.has_organization_record_permission(old.organization_id, 'work_orders.fill_procedure', old.created_by, old.assigned_to, false) then
    raise exception 'You do not have permission to update procedure progress';
  end if;

  new.updated_by = auth.uid();
  return new;
end;
$$;

drop trigger if exists work_orders_enforce_permissions on public.work_orders;
create trigger work_orders_enforce_permissions
before update on public.work_orders
for each row execute function public.enforce_work_order_permissions();

drop policy if exists "Members can view permitted work orders" on public.work_orders;
create policy "Members can view permitted work orders"
  on public.work_orders for select to authenticated
  using (public.has_organization_record_permission(organization_id, 'work_orders.view', created_by, assigned_to, false));

drop policy if exists "Members can create permitted work orders" on public.work_orders;
create policy "Members can create permitted work orders"
  on public.work_orders for insert to authenticated
  with check (
    created_by = auth.uid()
    and public.has_organization_permission(organization_id, 'work_orders.create', 'own')
  );

drop policy if exists "Members can update permitted work orders" on public.work_orders;
create policy "Members can update permitted work orders"
  on public.work_orders for update to authenticated
  using (
    public.has_organization_record_permission(organization_id, 'work_orders.edit', created_by, assigned_to, false)
    or public.has_organization_record_permission(organization_id, 'work_orders.change_status', created_by, assigned_to, false)
    or public.has_organization_record_permission(organization_id, 'work_orders.fill_procedure', created_by, assigned_to, false)
  )
  with check (
    public.has_organization_record_permission(organization_id, 'work_orders.edit', created_by, assigned_to, false)
    or public.has_organization_record_permission(organization_id, 'work_orders.change_status', created_by, assigned_to, false)
    or public.has_organization_record_permission(organization_id, 'work_orders.fill_procedure', created_by, assigned_to, false)
  );

drop policy if exists "Members can delete permitted work orders" on public.work_orders;
create policy "Members can delete permitted work orders"
  on public.work_orders for delete to authenticated
  using (public.has_organization_record_permission(organization_id, 'work_orders.delete', created_by, assigned_to, false));
