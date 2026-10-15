-- Add recoverable Work Order deletion with audit metadata.

alter table public.work_orders
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id) on delete set null;

create index if not exists work_orders_active_organization_idx
  on public.work_orders (organization_id, deleted_at);

alter table public.work_order_activity
  drop constraint if exists work_order_activity_event_type_check;

alter table public.work_order_activity
  add constraint work_order_activity_event_type_check
  check (event_type in (
    'work_order_created', 'work_order_updated', 'status_changed', 'work_order_deleted',
    'work_order_time_added', 'work_order_time_updated', 'work_order_time_deleted',
    'work_order_cost_added', 'work_order_cost_updated', 'work_order_cost_deleted',
    'external_completion_requested'
  ));

drop policy if exists "Members can view permitted work orders" on public.work_orders;
create policy "Members can view permitted work orders"
  on public.work_orders for select to authenticated
  using (deleted_at is null and public.has_work_order_permission(id, 'work_orders.view'));

create or replace function public.capture_work_order_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  changed_fields jsonb := '[]'::jsonb;
  changed_column record;
  event_actor_id uuid := coalesce(auth.uid(), new.updated_by, new.created_by);
begin
  if tg_op = 'INSERT' then
    insert into public.work_order_activity (organization_id, work_order_id, actor_id, event_type, details, created_at)
    values (new.organization_id, new.id, event_actor_id, 'work_order_created', jsonb_build_object('title', new.title), coalesce(new.created_at, now()));
    return new;
  end if;

  if old.status is distinct from new.status then
    insert into public.work_order_activity (organization_id, work_order_id, actor_id, event_type, details)
    values (new.organization_id, new.id, event_actor_id, 'status_changed', jsonb_build_object('from', old.status, 'to', new.status));
  end if;

  if old.due_date is distinct from new.due_date or old.due_time is distinct from new.due_time then
    changed_fields := changed_fields || jsonb_build_array(jsonb_build_object('field', 'due_date', 'from', jsonb_build_object('date', old.due_date, 'time', old.due_time), 'to', jsonb_build_object('date', new.due_date, 'time', new.due_time)));
  end if;

  for changed_column in
    select old_columns.key, old_columns.value as old_value, new_columns.value as new_value
    from jsonb_each(to_jsonb(old)) as old_columns(key, value)
    join jsonb_each(to_jsonb(new)) as new_columns(key, value) using (key)
    where old_columns.value is distinct from new_columns.value
      and old_columns.key not in ('id', 'organization_id', 'work_order_number', 'created_by', 'created_at', 'updated_by', 'updated_at', 'status', 'due_at', 'due_date', 'due_time', 'assigned_to', 'team_id', 'external_finished_at', 'external_finished_by_name', 'deleted_at', 'deleted_by')
    order by old_columns.key
  loop
    changed_fields := changed_fields || jsonb_build_array(jsonb_build_object('field', changed_column.key, 'from', changed_column.old_value, 'to', changed_column.new_value));
  end loop;

  if jsonb_array_length(changed_fields) > 0 then
    insert into public.work_order_activity (organization_id, work_order_id, actor_id, event_type, details)
    values (new.organization_id, new.id, event_actor_id, 'work_order_updated', jsonb_build_object('changes', changed_fields));
  end if;
  return new;
end;
$$;

create or replace function public.soft_delete_work_order(
  target_organization_id uuid,
  target_work_order_id uuid
)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  target_status text;
  target_recurrence_rule jsonb;
  deleted_timestamp timestamptz := now();
begin
  if auth.uid() is null then raise exception 'You must be signed in to delete Work Orders' using errcode = '42501'; end if;
  if not public.has_work_order_permission(target_work_order_id, 'work_orders.delete') then
    raise exception 'You do not have permission to delete this Work Order' using errcode = '42501';
  end if;

  select status, recurrence_rule into target_status, target_recurrence_rule
  from public.work_orders
  where id = target_work_order_id and organization_id = target_organization_id and deleted_at is null;
  if target_status is null then raise exception 'Work Order not found in this organization'; end if;
  if target_recurrence_rule is not null and target_status not in ('Completed', 'Skipped', 'Cancelled') then
    raise exception 'Skip or stop repeating this Work Order before deleting it';
  end if;

  update public.work_orders
  set deleted_at = deleted_timestamp, deleted_by = auth.uid()
  where id = target_work_order_id and organization_id = target_organization_id and deleted_at is null;

  insert into public.work_order_activity (organization_id, work_order_id, actor_id, event_type, details)
  values (target_organization_id, target_work_order_id, auth.uid(), 'work_order_deleted', jsonb_build_object('status', target_status, 'deleted_at', deleted_timestamp));
  return deleted_timestamp;
end;
$$;

revoke execute on function public.soft_delete_work_order(uuid, uuid) from public, anon;
grant execute on function public.soft_delete_work_order(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
