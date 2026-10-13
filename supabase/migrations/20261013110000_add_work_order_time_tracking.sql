-- Persist Work Order time tracking as resumable timer/manual entries.
-- Parts and other-cost entries remain separate feature boundaries.

create table if not exists public.work_order_tracking_types (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  kind text not null check (kind in ('time', 'cost')),
  name text not null check (char_length(btrim(name)) between 1 and 100),
  is_system boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, kind, name)
);

create table if not exists public.work_order_time_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  created_by uuid not null references auth.users(id) on delete restrict,
  tracking_type_id uuid not null references public.work_order_tracking_types(id) on delete restrict,
  source text not null check (source in ('manual', 'timer')),
  status text not null check (status in ('running', 'paused', 'completed')),
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  active_started_at timestamptz,
  hourly_rate numeric(12, 2) check (hourly_rate is null or hourly_rate >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  check (source = 'timer' or status = 'completed'),
  check (status <> 'running' or active_started_at is not null),
  check (status = 'running' or active_started_at is null),
  check (status <> 'completed' or completed_at is not null)
);

create table if not exists public.work_order_cost_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  created_by uuid not null references auth.users(id) on delete restrict,
  tracking_type_id uuid not null references public.work_order_tracking_types(id) on delete restrict,
  amount numeric(12, 2) not null check (amount >= 0),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists work_order_time_entries_active_unique_idx
  on public.work_order_time_entries(work_order_id, user_id)
  where status = 'running';
create index if not exists work_order_time_entries_work_order_idx
  on public.work_order_time_entries(organization_id, work_order_id, created_at desc);
create index if not exists work_order_time_entries_user_idx
  on public.work_order_time_entries(organization_id, user_id, status);
create index if not exists work_order_cost_entries_work_order_idx
  on public.work_order_cost_entries(organization_id, work_order_id, created_at desc);

create or replace function public.seed_work_order_tracking_types()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.work_order_tracking_types (organization_id, kind, name, is_system)
  values
    (new.id, 'time', 'Work', true),
    (new.id, 'time', 'Inspection', true),
    (new.id, 'time', 'Other', true),
    (new.id, 'cost', 'Labor', true),
    (new.id, 'cost', 'Travel', true),
    (new.id, 'cost', 'Other', true)
  on conflict (organization_id, kind, name) do nothing;
  return new;
end;
$$;

drop trigger if exists organizations_seed_work_order_tracking_types on public.organizations;
create trigger organizations_seed_work_order_tracking_types
after insert on public.organizations
for each row execute function public.seed_work_order_tracking_types();

insert into public.work_order_tracking_types (organization_id, kind, name, is_system)
select organizations.id, defaults.kind, defaults.name, true
from public.organizations organizations
cross join (values
  ('time', 'Work'), ('time', 'Inspection'), ('time', 'Other'),
  ('cost', 'Labor'), ('cost', 'Travel'), ('cost', 'Other')
) as defaults(kind, name)
on conflict (organization_id, kind, name) do nothing;

alter table public.work_order_tracking_types enable row level security;
alter table public.work_order_time_entries enable row level security;
alter table public.work_order_cost_entries enable row level security;

revoke all on public.work_order_tracking_types from anon, authenticated;
grant select, insert, update, delete on public.work_order_tracking_types to authenticated;
revoke all on public.work_order_time_entries from anon, authenticated;
grant select on public.work_order_time_entries to authenticated;
revoke all on public.work_order_cost_entries from anon, authenticated;
grant select on public.work_order_cost_entries to authenticated;

drop policy if exists "Members can view work order tracking types" on public.work_order_tracking_types;
create policy "Members can view work order tracking types"
  on public.work_order_tracking_types for select to authenticated
  using (exists (
    select 1 from public.organization_members members
    where members.organization_id = work_order_tracking_types.organization_id
      and members.user_id = auth.uid()
      and members.status = 'active'
  ));

drop policy if exists "Organization admins manage tracking types" on public.work_order_tracking_types;
create policy "Organization admins manage tracking types"
  on public.work_order_tracking_types for all to authenticated
  using (public.is_organization_admin(organization_id) and is_system = false)
  with check (public.is_organization_admin(organization_id) and is_system = false);

drop policy if exists "Members can view permitted work order time" on public.work_order_time_entries;
create policy "Members can view permitted work order time"
  on public.work_order_time_entries for select to authenticated
  using (public.has_work_order_permission(work_order_id, 'work_orders.view'));

drop policy if exists "Members can create permitted work order time" on public.work_order_time_entries;
create policy "Members can create permitted work order time"
  on public.work_order_time_entries for insert to authenticated
  with check (
    created_by = auth.uid()
    and public.has_work_order_permission(work_order_id, 'work_orders.view')
    and (user_id = auth.uid() or public.is_organization_admin(organization_id))
  );

drop policy if exists "Users can edit permitted work order time" on public.work_order_time_entries;
create policy "Users can edit permitted work order time"
  on public.work_order_time_entries for update to authenticated
  using (
    public.has_work_order_permission(work_order_id, 'work_orders.view')
    and (user_id = auth.uid() or public.is_organization_admin(organization_id))
  )
  with check (
    public.has_work_order_permission(work_order_id, 'work_orders.view')
    and (user_id = auth.uid() or public.is_organization_admin(organization_id))
  );

drop policy if exists "Users can delete permitted work order time" on public.work_order_time_entries;
create policy "Users can delete permitted work order time"
  on public.work_order_time_entries for delete to authenticated
  using (
    public.has_work_order_permission(work_order_id, 'work_orders.view')
    and (user_id = auth.uid() or public.is_organization_admin(organization_id))
  );

drop policy if exists "Members can view permitted work order costs" on public.work_order_cost_entries;
create policy "Members can view permitted work order costs"
  on public.work_order_cost_entries for select to authenticated
  using (public.has_work_order_permission(work_order_id, 'work_orders.view'));

drop policy if exists "Members can create permitted work order costs" on public.work_order_cost_entries;
create policy "Members can create permitted work order costs"
  on public.work_order_cost_entries for insert to authenticated
  with check (
    created_by = auth.uid()
    and public.has_work_order_permission(work_order_id, 'work_orders.view')
    and (user_id = auth.uid() or public.is_organization_admin(organization_id))
  );

drop policy if exists "Users can edit permitted work order costs" on public.work_order_cost_entries;
create policy "Users can edit permitted work order costs"
  on public.work_order_cost_entries for update to authenticated
  using (
    public.has_work_order_permission(work_order_id, 'work_orders.view')
    and (user_id = auth.uid() or public.is_organization_admin(organization_id))
  )
  with check (
    public.has_work_order_permission(work_order_id, 'work_orders.view')
    and (user_id = auth.uid() or public.is_organization_admin(organization_id))
  );

drop policy if exists "Users can delete permitted work order costs" on public.work_order_cost_entries;
create policy "Users can delete permitted work order costs"
  on public.work_order_cost_entries for delete to authenticated
  using (
    public.has_work_order_permission(work_order_id, 'work_orders.view')
    and (user_id = auth.uid() or public.is_organization_admin(organization_id))
  );

create or replace function public.start_work_order_timer(
  target_work_order_id uuid,
  target_tracking_type_id uuid default null
)
returns public.work_order_time_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_organization_id uuid;
  target_status text;
  tracking_type_id uuid;
  started_entry public.work_order_time_entries;
begin
  if current_user_id is null then raise exception 'You must be signed in to track Work Order time' using errcode = '42501'; end if;
  select work_orders.organization_id, work_orders.status
    into target_organization_id, target_status
  from public.work_orders work_orders
  where work_orders.id = target_work_order_id;
  if target_organization_id is null then raise exception 'Work Order not found'; end if;
  if not public.has_work_order_permission(target_work_order_id, 'work_orders.view') then raise exception 'You do not have permission to track this Work Order'; end if;
  if target_status = 'Completed' then raise exception 'Completed Work Orders cannot start a timer'; end if;
  if exists (select 1 from public.work_order_time_entries where work_order_id = target_work_order_id and user_id = current_user_id and status = 'running') then
    raise exception 'A timer is already running for this Work Order';
  end if;
  select id into tracking_type_id
  from public.work_order_tracking_types
  where organization_id = target_organization_id
    and kind = 'time'
    and id = coalesce(target_tracking_type_id, id)
  order by is_system desc, name
  limit 1;
  if tracking_type_id is null then raise exception 'A valid Work Order time type is required'; end if;
  if target_status <> 'In Progress' then
    if not public.has_work_order_permission(target_work_order_id, 'work_orders.change_status') then raise exception 'You do not have permission to start work on this Work Order'; end if;
    update public.work_orders set status = 'In Progress' where id = target_work_order_id;
  end if;
  insert into public.work_order_time_entries (organization_id, work_order_id, user_id, created_by, tracking_type_id, source, status, active_started_at)
  values (target_organization_id, target_work_order_id, current_user_id, current_user_id, tracking_type_id, 'timer', 'running', now())
  returning * into started_entry;
  return started_entry;
end;
$$;

create or replace function public.resume_work_order_timer(target_time_entry_id uuid)
returns public.work_order_time_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  resumed_entry public.work_order_time_entries;
begin
  if current_user_id is null then raise exception 'You must be signed in to track Work Order time' using errcode = '42501'; end if;
  update public.work_order_time_entries active_entry
  set status = 'running', active_started_at = now(), updated_at = now()
  where id = target_time_entry_id
    and status = 'paused'
    and (user_id = current_user_id or public.is_organization_admin(organization_id))
    and public.has_work_order_permission(work_order_id, 'work_orders.view')
    and not exists (select 1 from public.work_order_time_entries active where active.work_order_id = active_entry.work_order_id and active.user_id = active_entry.user_id and active.status = 'running');
  if not found then raise exception 'Paused timer could not be resumed'; end if;
  select * into resumed_entry from public.work_order_time_entries where id = target_time_entry_id;
  return resumed_entry;
end;
$$;

create or replace function public.pause_work_order_timer(target_time_entry_id uuid, finalize boolean default false)
returns public.work_order_time_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  paused_entry public.work_order_time_entries;
begin
  if current_user_id is null then raise exception 'You must be signed in to track Work Order time' using errcode = '42501'; end if;
  update public.work_order_time_entries
  set duration_seconds = duration_seconds + greatest(0, floor(extract(epoch from (now() - active_started_at)))::integer),
      active_started_at = null,
      status = case when finalize then 'completed' else 'paused' end,
      completed_at = case when finalize then now() else null end,
      updated_at = now()
  where id = target_time_entry_id
    and status = 'running'
    and active_started_at is not null
    and (user_id = current_user_id or public.is_organization_admin(organization_id))
    and public.has_work_order_permission(work_order_id, 'work_orders.view');
  if not found then raise exception 'Running timer could not be updated'; end if;
  select * into paused_entry from public.work_order_time_entries where id = target_time_entry_id;
  return paused_entry;
end;
$$;

create or replace function public.create_work_order_time_entry(
  target_work_order_id uuid,
  target_user_id uuid,
  target_tracking_type_id uuid,
  target_duration_seconds integer,
  target_hourly_rate numeric default null,
  target_notes text default null
)
returns public.work_order_time_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_organization_id uuid;
  entry public.work_order_time_entries;
begin
  if current_user_id is null then raise exception 'You must be signed in to track Work Order time' using errcode = '42501'; end if;
  select organization_id into target_organization_id from public.work_orders where id = target_work_order_id;
  if target_organization_id is null or not public.has_work_order_permission(target_work_order_id, 'work_orders.view') then raise exception 'You do not have permission to track this Work Order'; end if;
  if target_duration_seconds is null or target_duration_seconds <= 0 then raise exception 'Time must be greater than zero'; end if;
  if target_user_id is null then target_user_id := current_user_id; end if;
  if target_user_id <> current_user_id and not public.is_organization_admin(target_organization_id) then raise exception 'Only organization administrators can add time for another user'; end if;
  if not exists (select 1 from public.organization_members where organization_id = target_organization_id and user_id = target_user_id and status = 'active') then raise exception 'Time user must be an active organization member'; end if;
  if target_tracking_type_id is null then
    select id into target_tracking_type_id
    from public.work_order_tracking_types
    where organization_id = target_organization_id and kind = 'time'
    order by is_system desc, name
    limit 1;
  end if;
  if not exists (select 1 from public.work_order_tracking_types where id = target_tracking_type_id and organization_id = target_organization_id and kind = 'time') then raise exception 'A valid Work Order time type is required'; end if;
  insert into public.work_order_time_entries (organization_id, work_order_id, user_id, created_by, tracking_type_id, source, status, duration_seconds, hourly_rate, notes, completed_at)
  values (target_organization_id, target_work_order_id, target_user_id, current_user_id, target_tracking_type_id, 'manual', 'completed', target_duration_seconds, target_hourly_rate, nullif(btrim(target_notes), ''), now())
  returning * into entry;
  return entry;
end;
$$;

create or replace function public.create_work_order_cost_entry(
  target_work_order_id uuid,
  target_user_id uuid,
  target_tracking_type_id uuid,
  target_amount numeric,
  target_description text default null
)
returns public.work_order_cost_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_organization_id uuid;
  entry public.work_order_cost_entries;
begin
  if current_user_id is null then raise exception 'You must be signed in to track Work Order costs' using errcode = '42501'; end if;
  select organization_id into target_organization_id from public.work_orders where id = target_work_order_id;
  if target_organization_id is null or not public.has_work_order_permission(target_work_order_id, 'work_orders.view') then raise exception 'You do not have permission to track this Work Order'; end if;
  if target_amount is null or target_amount < 0 then raise exception 'Cost must be zero or greater'; end if;
  if target_user_id is null then target_user_id := current_user_id; end if;
  if target_user_id <> current_user_id and not public.is_organization_admin(target_organization_id) then raise exception 'Only organization administrators can add costs for another user'; end if;
  if not exists (select 1 from public.organization_members where organization_id = target_organization_id and user_id = target_user_id and status = 'active') then raise exception 'Cost user must be an active organization member'; end if;
  if not exists (select 1 from public.work_order_tracking_types where id = target_tracking_type_id and organization_id = target_organization_id and kind = 'cost') then raise exception 'A valid Work Order cost type is required'; end if;
  insert into public.work_order_cost_entries (organization_id, work_order_id, user_id, created_by, tracking_type_id, amount, description)
  values (target_organization_id, target_work_order_id, target_user_id, current_user_id, target_tracking_type_id, target_amount, nullif(btrim(target_description), ''))
  returning * into entry;
  return entry;
end;
$$;

create or replace function public.update_work_order_time_entry(
  target_time_entry_id uuid,
  target_tracking_type_id uuid,
  target_duration_seconds integer,
  target_hourly_rate numeric default null,
  target_notes text default null
)
returns public.work_order_time_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  existing public.work_order_time_entries;
  updated_entry public.work_order_time_entries;
begin
  if current_user_id is null then raise exception 'You must be signed in to edit Work Order time' using errcode = '42501'; end if;
  select * into existing from public.work_order_time_entries where id = target_time_entry_id;
  if not found then raise exception 'Time entry not found'; end if;
  if not public.has_work_order_permission(existing.work_order_id, 'work_orders.view') or (existing.user_id <> current_user_id and not public.is_organization_admin(existing.organization_id)) then raise exception 'You do not have permission to edit this time entry'; end if;
  if existing.status = 'running' then raise exception 'Pause or stop a timer before editing it'; end if;
  if target_duration_seconds is null or target_duration_seconds <= 0 then raise exception 'Time must be greater than zero'; end if;
  if not exists (select 1 from public.work_order_tracking_types where id = target_tracking_type_id and organization_id = existing.organization_id and kind = 'time') then raise exception 'A valid Work Order time type is required'; end if;
  update public.work_order_time_entries
  set tracking_type_id = target_tracking_type_id, duration_seconds = target_duration_seconds, hourly_rate = target_hourly_rate, notes = nullif(btrim(target_notes), ''), updated_at = now()
  where id = target_time_entry_id
  returning * into updated_entry;
  return updated_entry;
end;
$$;

create or replace function public.delete_work_order_time_entry(target_time_entry_id uuid)
returns public.work_order_time_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  deleted_entry public.work_order_time_entries;
begin
  if current_user_id is null then raise exception 'You must be signed in to delete Work Order time' using errcode = '42501'; end if;
  delete from public.work_order_time_entries entry
  where entry.id = target_time_entry_id
    and public.has_work_order_permission(entry.work_order_id, 'work_orders.view')
    and (entry.user_id = current_user_id or public.is_organization_admin(entry.organization_id))
  returning entry.* into deleted_entry;
  if not found then raise exception 'You do not have permission to delete this time entry'; end if;
  return deleted_entry;
end;
$$;

create or replace function public.update_work_order_cost_entry(
  target_cost_entry_id uuid,
  target_tracking_type_id uuid,
  target_amount numeric,
  target_description text default null
)
returns public.work_order_cost_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  existing public.work_order_cost_entries;
  updated_entry public.work_order_cost_entries;
begin
  if current_user_id is null then raise exception 'You must be signed in to edit Work Order costs' using errcode = '42501'; end if;
  select * into existing from public.work_order_cost_entries where id = target_cost_entry_id;
  if not found then raise exception 'Cost entry not found'; end if;
  if not public.has_work_order_permission(existing.work_order_id, 'work_orders.view') or (existing.user_id <> current_user_id and not public.is_organization_admin(existing.organization_id)) then raise exception 'You do not have permission to edit this cost entry'; end if;
  if target_amount is null or target_amount < 0 then raise exception 'Cost must be zero or greater'; end if;
  if not exists (select 1 from public.work_order_tracking_types where id = target_tracking_type_id and organization_id = existing.organization_id and kind = 'cost') then raise exception 'A valid Work Order cost type is required'; end if;
  update public.work_order_cost_entries
  set tracking_type_id = target_tracking_type_id, amount = target_amount, description = nullif(btrim(target_description), ''), updated_at = now()
  where id = target_cost_entry_id
  returning * into updated_entry;
  return updated_entry;
end;
$$;

create or replace function public.delete_work_order_cost_entry(target_cost_entry_id uuid)
returns public.work_order_cost_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  deleted_entry public.work_order_cost_entries;
begin
  if current_user_id is null then raise exception 'You must be signed in to delete Work Order costs' using errcode = '42501'; end if;
  delete from public.work_order_cost_entries entry
  where entry.id = target_cost_entry_id
    and public.has_work_order_permission(entry.work_order_id, 'work_orders.view')
    and (entry.user_id = current_user_id or public.is_organization_admin(entry.organization_id))
  returning entry.* into deleted_entry;
  if not found then raise exception 'You do not have permission to delete this cost entry'; end if;
  return deleted_entry;
end;
$$;

alter table public.work_order_activity
  drop constraint if exists work_order_activity_event_type_check;
alter table public.work_order_activity
  add constraint work_order_activity_event_type_check
  check (event_type in ('work_order_created', 'work_order_updated', 'status_changed', 'work_order_time_added', 'work_order_time_updated', 'work_order_time_deleted', 'work_order_cost_added', 'work_order_cost_updated', 'work_order_cost_deleted'));

create or replace function public.capture_work_order_time_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  event_actor_id uuid;
  event_type text;
  event_details jsonb;
begin
  event_actor_id := auth.uid();
  if tg_op = 'INSERT' then
    event_actor_id := coalesce(event_actor_id, new.created_by);
    event_type := 'work_order_time_added';
    event_details := jsonb_build_object('time_entry_id', new.id, 'user_id', new.user_id, 'source', new.source, 'duration_seconds', new.duration_seconds, 'status', new.status);
  elsif tg_op = 'UPDATE' then
    event_actor_id := coalesce(event_actor_id, new.created_by, old.created_by);
    event_type := 'work_order_time_updated';
    event_details := jsonb_build_object(
      'time_entry_id', new.id,
      'user_id', new.user_id,
      'from_seconds', old.duration_seconds,
      'to_seconds', new.duration_seconds,
      'from_status', old.status,
      'to_status', new.status
    );
  else
    event_actor_id := coalesce(event_actor_id, old.created_by);
    event_type := 'work_order_time_deleted';
    event_details := jsonb_build_object('time_entry_id', old.id, 'user_id', old.user_id, 'duration_seconds', old.duration_seconds);
  end if;

  insert into public.work_order_activity (organization_id, work_order_id, actor_id, event_type, details)
  values (coalesce(new.organization_id, old.organization_id), coalesce(new.work_order_id, old.work_order_id), event_actor_id, event_type, event_details);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists work_order_time_entries_capture_activity on public.work_order_time_entries;
create trigger work_order_time_entries_capture_activity
after insert or update or delete on public.work_order_time_entries
for each row execute function public.capture_work_order_time_activity();

create or replace function public.capture_work_order_cost_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  event_actor_id uuid := auth.uid();
  event_type text;
  event_details jsonb;
begin
  if tg_op = 'INSERT' then
    event_actor_id := coalesce(event_actor_id, new.created_by);
    event_type := 'work_order_cost_added';
    event_details := jsonb_build_object('cost_entry_id', new.id, 'user_id', new.user_id, 'amount', new.amount);
  elsif tg_op = 'UPDATE' then
    event_actor_id := coalesce(event_actor_id, new.created_by, old.created_by);
    event_type := 'work_order_cost_updated';
    event_details := jsonb_build_object('cost_entry_id', new.id, 'user_id', new.user_id, 'from_amount', old.amount, 'to_amount', new.amount);
  else
    event_actor_id := coalesce(event_actor_id, old.created_by);
    event_type := 'work_order_cost_deleted';
    event_details := jsonb_build_object('cost_entry_id', old.id, 'user_id', old.user_id, 'amount', old.amount);
  end if;
  insert into public.work_order_activity (organization_id, work_order_id, actor_id, event_type, details)
  values (coalesce(new.organization_id, old.organization_id), coalesce(new.work_order_id, old.work_order_id), event_actor_id, event_type, event_details);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists work_order_cost_entries_capture_activity on public.work_order_cost_entries;
create trigger work_order_cost_entries_capture_activity
after insert or update or delete on public.work_order_cost_entries
for each row execute function public.capture_work_order_cost_activity();

create or replace function public.enforce_work_order_tracking_requirements()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  require_time boolean;
  require_cost boolean;
begin
  if old.status is distinct from new.status and new.status = 'Completed' then
    select
      coalesce((organizations.work_order_settings ->> 'requireTimeTracking') = 'true', false),
      coalesce((organizations.work_order_settings ->> 'requireCostTracking') = 'true', false)
    into require_time, require_cost
    from public.organizations organizations
    where organizations.id = new.organization_id;

    if require_time and not exists (
      select 1 from public.work_order_time_entries entries
      where entries.work_order_id = new.id
        and entries.status = 'completed'
        and entries.duration_seconds > 0
    ) then
      raise exception 'Time tracking is required before completing this Work Order';
    end if;

    if require_cost and not exists (
      select 1 from public.work_order_cost_entries entries
      where entries.work_order_id = new.id
    ) then
      raise exception 'Cost tracking is required before completing this Work Order';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists work_orders_enforce_tracking_requirements on public.work_orders;
create trigger work_orders_enforce_tracking_requirements
before update of status on public.work_orders
for each row execute function public.enforce_work_order_tracking_requirements();

revoke all on function public.start_work_order_timer(uuid, uuid) from public, anon;
revoke all on function public.resume_work_order_timer(uuid) from public, anon;
revoke all on function public.pause_work_order_timer(uuid, boolean) from public, anon;
revoke all on function public.create_work_order_time_entry(uuid, uuid, uuid, integer, numeric, text) from public, anon;
revoke all on function public.create_work_order_cost_entry(uuid, uuid, uuid, numeric, text) from public, anon;
revoke all on function public.update_work_order_time_entry(uuid, uuid, integer, numeric, text) from public, anon;
revoke all on function public.delete_work_order_time_entry(uuid) from public, anon;
revoke all on function public.update_work_order_cost_entry(uuid, uuid, numeric, text) from public, anon;
revoke all on function public.delete_work_order_cost_entry(uuid) from public, anon;
grant execute on function public.start_work_order_timer(uuid, uuid) to authenticated;
grant execute on function public.resume_work_order_timer(uuid) to authenticated;
grant execute on function public.pause_work_order_timer(uuid, boolean) to authenticated;
grant execute on function public.create_work_order_time_entry(uuid, uuid, uuid, integer, numeric, text) to authenticated;
grant execute on function public.create_work_order_cost_entry(uuid, uuid, uuid, numeric, text) to authenticated;
grant execute on function public.update_work_order_time_entry(uuid, uuid, integer, numeric, text) to authenticated;
grant execute on function public.delete_work_order_time_entry(uuid) to authenticated;
grant execute on function public.update_work_order_cost_entry(uuid, uuid, numeric, text) to authenticated;
grant execute on function public.delete_work_order_cost_entry(uuid) to authenticated;

notify pgrst, 'reload schema';
