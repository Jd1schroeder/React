-- Surface external completion requests in the internal Work Order activity feed
-- without allowing the external bearer-token RPC to change Work Order status.

alter table public.work_order_activity
  drop constraint if exists work_order_activity_event_type_check;

alter table public.work_order_activity
  add constraint work_order_activity_event_type_check
  check (event_type in (
    'work_order_created',
    'work_order_updated',
    'status_changed',
    'external_completion_requested'
  ));

-- External completion fields are surfaced by their own event so the generic
-- Work Order change feed does not attribute an anonymous vendor action to an
-- internal member or expose raw implementation fields to staff.
create or replace function public.capture_external_work_order_completion_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.external_finished_at is null and new.external_finished_at is not null then
    insert into public.work_order_activity (
      organization_id,
      work_order_id,
      actor_id,
      event_type,
      details,
      created_at
    ) values (
      new.organization_id,
      new.id,
      null,
      'external_completion_requested',
      jsonb_build_object(
        'externalName', new.external_finished_by_name,
        'finishedAt', new.external_finished_at
      ),
      new.external_finished_at
    );
  end if;
  return new;
end;
$$;

revoke all on function public.capture_external_work_order_completion_activity() from public;

drop trigger if exists work_orders_capture_external_completion_activity on public.work_orders;
create trigger work_orders_capture_external_completion_activity
after update of external_finished_at on public.work_orders
for each row
when (old.external_finished_at is distinct from new.external_finished_at)
execute function public.capture_external_work_order_completion_activity();

-- Keep the generic change feed from creating a second raw-field event for the
-- same external completion request.
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
    values (
      new.organization_id, new.id, event_actor_id, 'work_order_created',
      jsonb_build_object('title', new.title), coalesce(new.created_at, now())
    );
    return new;
  end if;

  if old.status is distinct from new.status then
    insert into public.work_order_activity (organization_id, work_order_id, actor_id, event_type, details)
    values (new.organization_id, new.id, event_actor_id, 'status_changed',
      jsonb_build_object('from', old.status, 'to', new.status));
  end if;

  if old.due_date is distinct from new.due_date or old.due_time is distinct from new.due_time then
    changed_fields := changed_fields || jsonb_build_array(jsonb_build_object(
      'field', 'due_date',
      'from', jsonb_build_object('date', old.due_date, 'time', old.due_time),
      'to', jsonb_build_object('date', new.due_date, 'time', new.due_time)
    ));
  end if;

  for changed_column in
    select old_columns.key, old_columns.value as old_value, new_columns.value as new_value
    from jsonb_each(to_jsonb(old)) as old_columns(key, value)
    join jsonb_each(to_jsonb(new)) as new_columns(key, value) using (key)
    where old_columns.value is distinct from new_columns.value
      and old_columns.key not in (
        'id', 'organization_id', 'work_order_number', 'created_by', 'created_at',
        'updated_by', 'updated_at', 'status', 'due_at', 'due_date', 'due_time',
        'assigned_to', 'team_id', 'external_finished_at', 'external_finished_by_name'
      )
    order by old_columns.key
  loop
    changed_fields := changed_fields || jsonb_build_array(jsonb_build_object(
      'field', changed_column.key,
      'from', changed_column.old_value,
      'to', changed_column.new_value
    ));
  end loop;

  if jsonb_array_length(changed_fields) > 0 then
    insert into public.work_order_activity (organization_id, work_order_id, actor_id, event_type, details)
    values (new.organization_id, new.id, event_actor_id, 'work_order_updated', jsonb_build_object('changes', changed_fields));
  end if;
  return new;
end;
$$;

notify pgrst, 'reload schema';

select 'External completion requests now appear in internal activity' as result;
