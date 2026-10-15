-- Skipping a recurring Work Order advances the chain to its next occurrence.

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
     or new.status not in ('Completed', 'Skipped')
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
      select min(((value)::integer - current_weekday + 7) % 7) into days_until
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
      if extract(month from next_start)::integer <> target_month then next_start := next_start - 7; end if;
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
    for next_assignment in select user_id, team_id from public.work_order_assignments where work_order_id = new.id loop
      insert into public.work_order_assignments (organization_id, work_order_id, user_id, team_id)
      values (new.organization_id, next_work_order_id, next_assignment.user_id, next_assignment.team_id);
    end loop;
  end if;
  return new;
end;
$$;

notify pgrst, 'reload schema';
