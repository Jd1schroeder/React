-- Persist recurrence rules and create the next Work Order when a recurring
-- Work Order is completed. Rules are JSON so the form can evolve without
-- adding a column for every cadence-specific option.

alter table public.work_orders
  add column if not exists recurrence_rule jsonb,
  add column if not exists recurrence_series_id uuid default gen_random_uuid(),
  add column if not exists recurrence_sequence integer default 0;

update public.work_orders
set recurrence_series_id = gen_random_uuid()
where recurrence_series_id is null;

alter table public.work_orders
  alter column recurrence_series_id set not null,
  alter column recurrence_sequence set not null,
  add constraint work_orders_recurrence_rule_object_check
    check (recurrence_rule is null or jsonb_typeof(recurrence_rule) = 'object'),
  add constraint work_orders_recurrence_sequence_check
    check (recurrence_sequence >= 0);

create unique index if not exists work_orders_recurrence_series_sequence_idx
  on public.work_orders(recurrence_series_id, recurrence_sequence);

create or replace function public.validate_work_order_recurrence_rule(target_rule jsonb)
returns boolean
language plpgsql
immutable
as $$
declare
  frequency text;
  interval_value integer;
  period_value integer;
begin
  if target_rule is null then return true; end if;
  if jsonb_typeof(target_rule) <> 'object' then return false; end if;
  frequency := target_rule ->> 'frequency';
  interval_value := coalesce((target_rule ->> 'interval')::integer, 1);
  if frequency not in ('daily', 'weekly', 'monthly-date', 'monthly-weekday', 'yearly', 'periodically') then return false; end if;
  if interval_value < 1 then return false; end if;
  if frequency = 'weekly' and (coalesce(jsonb_typeof(target_rule -> 'weekdays'), '') <> 'array' or jsonb_array_length(target_rule -> 'weekdays') = 0) then return false; end if;
  if frequency = 'weekly' and exists (
    select 1 from jsonb_array_elements_text(target_rule -> 'weekdays') as weekdays(value)
    where value not in ('0', '1', '2', '3', '4', '5', '6')
  ) then return false; end if;
  if frequency = 'monthly-date' and coalesce((target_rule ->> 'monthDay')::integer, 0) not between 1 and 31 then return false; end if;
  if frequency = 'monthly-weekday' and target_rule ->> 'monthWeek' not in ('1', '2', '3', '4', 'last') then return false; end if;
  if frequency = 'monthly-weekday' and coalesce((target_rule ->> 'monthWeekday')::integer, -1) not between 0 and 6 then return false; end if;
  if frequency = 'periodically' then
    period_value := coalesce((target_rule ->> 'period')::integer, 0);
    if period_value < 1 or target_rule ->> 'periodUnit' not in ('minutes', 'hours') then return false; end if;
  end if;
  return true;
exception when others then
  return false;
end;
$$;

alter table public.work_orders
  add constraint work_orders_recurrence_rule_valid_check
    check (public.validate_work_order_recurrence_rule(recurrence_rule));

revoke all on function public.validate_work_order_recurrence_rule(jsonb) from public, anon;
grant execute on function public.validate_work_order_recurrence_rule(jsonb) to authenticated;

-- Replace the custom-field-aware creation RPC with a recurrence-aware version.
drop function if exists public.create_work_order_with_custom_fields(
  uuid, uuid, text, text, text, date, time, date, integer, text, jsonb, jsonb, jsonb
);
drop function if exists public.create_work_order_with_custom_fields(
  uuid, uuid, text, text, text, date, time, date, integer, text, jsonb, jsonb, jsonb, jsonb
);

create or replace function public.create_work_order_with_custom_fields(
  target_work_order_id uuid,
  target_organization_id uuid,
  target_title text,
  target_description text default null,
  target_priority text default null,
  target_due_date date default null,
  target_due_time time default null,
  target_start_date date default null,
  target_estimated_duration_minutes integer default null,
  target_work_type text default 'reactive',
  target_assignments jsonb default '[]'::jsonb,
  target_attachments jsonb default '[]'::jsonb,
  target_custom_field_values jsonb default '{}'::jsonb,
  target_recurrence_rule jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  created_work_order public.work_orders;
  configured_field jsonb;
  field_id text;
  field_value jsonb;
  selected_assignment jsonb;
  selected_user_id uuid;
  selected_team_id uuid;
  selected_attachment jsonb;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to create a Work Order' using errcode = '42501';
  end if;
  if not public.has_organization_permission(target_organization_id, 'work_orders.create', 'own') then
    raise exception 'You do not have permission to create Work Orders in this organization' using errcode = '42501';
  end if;
  if not public.validate_work_order_recurrence_rule(target_recurrence_rule) then
    raise exception 'Invalid Work Order recurrence rule';
  end if;
  if jsonb_typeof(coalesce(target_assignments, '[]'::jsonb)) <> 'array' or jsonb_typeof(coalesce(target_attachments, '[]'::jsonb)) <> 'array' then
    raise exception 'Assignments and attachments must be arrays';
  end if;
  if jsonb_typeof(coalesce(target_custom_field_values, '{}'::jsonb)) <> 'object' then
    raise exception 'Custom field values must be an object';
  end if;

  for configured_field in
    select value
    from public.organizations organizations,
      jsonb_array_elements(coalesce(organizations.work_order_settings -> 'workOrderFields' -> 'customFields', '[]'::jsonb)) as fields(value)
    where organizations.id = target_organization_id
      and coalesce((fields.value ->> 'required')::boolean, false)
  loop
    field_id := nullif(configured_field ->> 'id', '');
    field_value := target_custom_field_values -> field_id;
    if field_id is not null and (
      field_value is null
      or field_value = 'null'::jsonb
      or (jsonb_typeof(field_value) = 'string' and btrim(field_value #>> '{}') = '')
      or (jsonb_typeof(field_value) = 'array' and jsonb_array_length(field_value) = 0)
    ) then
      raise exception 'The required custom field "%" must be completed', coalesce(configured_field ->> 'name', field_id);
    end if;
  end loop;

  select nullif(assignment.value ->> 'user_id', '')::uuid into selected_user_id
  from jsonb_array_elements(target_assignments) as assignment(value)
  where nullif(assignment.value ->> 'user_id', '') is not null limit 1;
  select nullif(assignment.value ->> 'team_id', '')::uuid into selected_team_id
  from jsonb_array_elements(target_assignments) as assignment(value)
  where nullif(assignment.value ->> 'team_id', '') is not null limit 1;

  insert into public.work_orders (
    id, organization_id, title, description, priority, due_date, due_time,
    start_date, estimated_duration_minutes, work_type, assigned_to, team_id,
    created_by, custom_field_values, recurrence_rule
  ) values (
    target_work_order_id, target_organization_id, target_title, nullif(btrim(target_description), ''), target_priority,
    target_due_date, target_due_time, target_start_date, nullif(target_estimated_duration_minutes, 0),
    target_work_type, selected_user_id, selected_team_id, auth.uid(), coalesce(target_custom_field_values, '{}'::jsonb), target_recurrence_rule
  ) returning * into created_work_order;

  for selected_assignment in select value from jsonb_array_elements(target_assignments)
  loop
    insert into public.work_order_assignments (organization_id, work_order_id, user_id, team_id)
    values (target_organization_id, target_work_order_id, nullif(selected_assignment ->> 'user_id', '')::uuid, nullif(selected_assignment ->> 'team_id', '')::uuid);
  end loop;

  for selected_attachment in select value from jsonb_array_elements(target_attachments)
  loop
    insert into public.work_order_attachments (
      id, organization_id, work_order_id, kind, storage_path, file_name,
      content_type, byte_size, is_thumbnail, uploaded_by
    ) values (
      (selected_attachment ->> 'id')::uuid, target_organization_id, target_work_order_id,
      selected_attachment ->> 'kind', selected_attachment ->> 'storage_path', selected_attachment ->> 'file_name',
      coalesce(nullif(selected_attachment ->> 'content_type', ''), 'application/octet-stream'),
      (selected_attachment ->> 'byte_size')::bigint, coalesce((selected_attachment ->> 'is_thumbnail')::boolean, false), auth.uid()
    );
  end loop;

  return to_jsonb(created_work_order);
end;
$$;

revoke execute on function public.create_work_order_with_custom_fields(uuid, uuid, text, text, text, date, time, date, integer, text, jsonb, jsonb, jsonb, jsonb) from public;
grant execute on function public.create_work_order_with_custom_fields(uuid, uuid, text, text, text, date, time, date, integer, text, jsonb, jsonb, jsonb, jsonb) to authenticated;

-- Extend the attachment-aware edit boundary with the same rule validation.
drop function if exists public.update_work_order_with_attachment_state(
  uuid, uuid, text, text, text, date, time, date, integer, text, jsonb, jsonb, jsonb
);
drop function if exists public.update_work_order_with_attachment_state(
  uuid, uuid, text, text, text, date, time, date, integer, text, jsonb, jsonb, jsonb, jsonb
);

create or replace function public.update_work_order_with_attachment_state(
  target_work_order_id uuid,
  target_organization_id uuid,
  target_title text,
  target_description text default null,
  target_priority text default null,
  target_due_date date default null,
  target_due_time time default null,
  target_start_date date default null,
  target_estimated_duration_minutes integer default null,
  target_work_type text default 'reactive',
  target_assignments jsonb default null,
  target_attachments jsonb default '[]'::jsonb,
  target_attachment_state jsonb default '[]'::jsonb,
  target_recurrence_rule jsonb default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  updated_work_order jsonb;
  removed_attachment_paths jsonb;
begin
  if not public.validate_work_order_recurrence_rule(target_recurrence_rule) then
    raise exception 'Invalid Work Order recurrence rule';
  end if;
  updated_work_order := public.update_work_order_with_assignments(
    target_work_order_id, target_organization_id, target_title, target_description, target_priority,
    target_due_date, target_due_time, target_start_date, target_estimated_duration_minutes,
    target_work_type, target_assignments, target_attachments
  );
  update public.work_orders
  set recurrence_rule = target_recurrence_rule
  where organization_id = target_organization_id and id = target_work_order_id;
  removed_attachment_paths := public.reconcile_work_order_attachments(
    target_work_order_id, target_organization_id, target_attachment_state
  );
  return updated_work_order || jsonb_build_object('recurrence_rule', target_recurrence_rule, 'removed_attachment_paths', removed_attachment_paths);
end;
$$;

revoke execute on function public.update_work_order_with_attachment_state(uuid, uuid, text, text, text, date, time, date, integer, text, jsonb, jsonb, jsonb, jsonb) from public;
grant execute on function public.update_work_order_with_attachment_state(uuid, uuid, text, text, text, date, time, date, integer, text, jsonb, jsonb, jsonb, jsonb) to authenticated;

create or replace function public.enforce_work_order_recurrence_permission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
     and old.recurrence_rule is distinct from new.recurrence_rule
     and not public.has_work_order_permission(old.id, 'work_orders.edit') then
    raise exception 'You do not have permission to edit Work Order recurrence' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists work_orders_enforce_recurrence_permission on public.work_orders;
create trigger work_orders_enforce_recurrence_permission
before update of recurrence_rule on public.work_orders
for each row execute function public.enforce_work_order_recurrence_permission();

create or replace function public.add_work_order_recurrence_interval(base_date date, target_rule jsonb)
returns date
language plpgsql
immutable
as $$
declare
  frequency text := target_rule ->> 'frequency';
  interval_value integer := coalesce((target_rule ->> 'interval')::integer, 1);
begin
  if frequency = 'daily' then return base_date + interval_value;
  elsif frequency = 'weekly' then return base_date + (interval_value * 7);
  elsif frequency in ('monthly-date', 'monthly-weekday') then return (base_date + make_interval(months => interval_value))::date;
  elsif frequency = 'yearly' then return (base_date + make_interval(years => interval_value))::date;
  end if;
  return base_date;
end;
$$;

create or replace function public.create_next_recurring_work_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_rule jsonb := new.recurrence_rule;
  frequency text;
  next_start date;
  next_due date;
  next_due_time time;
  next_periodic_at timestamp without time zone;
  base_date date;
  due_offset integer;
  interval_value integer;
  target_day integer;
  target_year integer;
  target_month integer;
  last_day integer;
  weekday_value integer;
  current_weekday integer;
  days_until integer;
  month_week text;
  series_id uuid := new.recurrence_series_id;
  next_sequence integer := new.recurrence_sequence + 1;
  next_work_order_id uuid := gen_random_uuid();
  next_assignment record;
  organization_timezone text;
  completion_date date;
begin
  if old.status is not distinct from new.status
     or new.status <> 'Completed'
     or target_rule is null
     or not public.validate_work_order_recurrence_rule(target_rule) then
    return new;
  end if;

  frequency := target_rule ->> 'frequency';
  interval_value := coalesce((target_rule ->> 'interval')::integer, 1);
  select coalesce(nullif(timezone, ''), 'UTC') into organization_timezone
  from public.organizations where id = new.organization_id;
  completion_date := (now() at time zone coalesce(organization_timezone, 'UTC'))::date;
  base_date := greatest(coalesce(new.start_date, completion_date), completion_date);
  due_offset := case when new.start_date is not null and new.due_date is not null then new.due_date - new.start_date else null end;

  if frequency = 'daily' then
    next_start := base_date + interval_value;
  elsif frequency = 'weekly' then
    next_start := base_date + (interval_value * 7);
    if jsonb_array_length(target_rule -> 'weekdays') > 0 then
      current_weekday := extract(dow from next_start)::integer;
      select min(((value)::integer - current_weekday + 7) % 7)
        into days_until
      from jsonb_array_elements_text(target_rule -> 'weekdays') as weekdays(value);
      next_start := next_start + coalesce(days_until, 0);
    end if;
  elsif frequency = 'monthly-date' then
    next_start := (date_trunc('month', base_date)::date + make_interval(months => interval_value))::date;
    target_day := (target_rule ->> 'monthDay')::integer;
    last_day := extract(day from (date_trunc('month', next_start) + interval '1 month - 1 day'))::integer;
    next_start := next_start + least(target_day, last_day) - 1;
  elsif frequency = 'monthly-weekday' then
    next_start := (date_trunc('month', base_date)::date + make_interval(months => interval_value))::date;
    target_year := extract(year from next_start)::integer;
    target_month := extract(month from next_start)::integer;
    weekday_value := coalesce((target_rule ->> 'monthWeekday')::integer, extract(dow from base_date)::integer);
    month_week := coalesce(target_rule ->> 'monthWeek', '1');
    if month_week = 'last' then
      next_start := (date_trunc('month', next_start) + interval '1 month - 1 day')::date;
      next_start := next_start - ((extract(dow from next_start)::integer - weekday_value + 7) % 7);
    else
      next_start := next_start + ((weekday_value - extract(dow from next_start)::integer + 7) % 7) + ((month_week::integer - 1) * 7);
      if extract(month from next_start)::integer <> target_month then
        next_start := next_start - 7;
      end if;
    end if;
  elsif frequency = 'yearly' then
    base_date := coalesce(new.start_date, completion_date);
    next_start := (make_date(extract(year from base_date)::integer + interval_value, extract(month from base_date)::integer, 1)
      + least(extract(day from base_date)::integer, extract(day from (date_trunc('month', make_date(extract(year from base_date)::integer + interval_value, extract(month from base_date)::integer, 1)) + interval '1 month - 1 day'))::integer) - 1);
  elsif frequency = 'periodically' then
    next_periodic_at := case
      when target_rule ->> 'periodUnit' = 'minutes' then (now() at time zone coalesce(organization_timezone, 'UTC')) + make_interval(mins => (target_rule ->> 'period')::integer)
      else (now() at time zone coalesce(organization_timezone, 'UTC')) + make_interval(hours => (target_rule ->> 'period')::integer)
    end;
    next_due := next_periodic_at::date;
    next_due_time := next_periodic_at::time;
  else
    return new;
  end if;

  if frequency <> 'periodically' then
    next_due := case when due_offset is null then null else next_start + due_offset end;
  end if;
  insert into public.work_orders (
    id, organization_id, title, description, priority, due_date, due_time, start_date,
    estimated_duration_minutes, work_type, assigned_to, team_id, created_by,
    custom_field_values, recurrence_rule, recurrence_series_id, recurrence_sequence
  ) values (
    next_work_order_id, new.organization_id, new.title, new.description, new.priority,
    next_due, next_due_time, case when frequency = 'periodically' then null else next_start end,
    new.estimated_duration_minutes, new.work_type, new.assigned_to, new.team_id, new.created_by,
    new.custom_field_values, target_rule, series_id, next_sequence
  ) on conflict (recurrence_series_id, recurrence_sequence) do nothing;

  if found then
    for next_assignment in
      select user_id, team_id from public.work_order_assignments where work_order_id = new.id
    loop
      insert into public.work_order_assignments (organization_id, work_order_id, user_id, team_id)
      values (new.organization_id, next_work_order_id, next_assignment.user_id, next_assignment.team_id);
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists work_orders_create_next_recurrence on public.work_orders;
create trigger work_orders_create_next_recurrence
after update of status on public.work_orders
for each row execute function public.create_next_recurring_work_order();

revoke all on function public.add_work_order_recurrence_interval(date, jsonb) from public, anon, authenticated;
revoke all on function public.create_next_recurring_work_order() from public, anon, authenticated;

notify pgrst, 'reload schema';
