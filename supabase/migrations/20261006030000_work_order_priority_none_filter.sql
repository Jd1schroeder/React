create or replace function public.validate_work_order_inbox_filters(target_filters jsonb)
returns void
language plpgsql
immutable
security invoker
set search_path = public
as $$
declare
  filter_item jsonb;
  filter_field text;
  filter_operator text;
  selected_values text[];
  seen_fields text[] := array[]::text[];
  selected_date date;
  first_date date;
  second_date date;
begin
  if target_filters is null then
    return;
  end if;
  if jsonb_typeof(target_filters) is distinct from 'array' or jsonb_array_length(target_filters) > 6 then
    raise exception 'Invalid Work Order filter list';
  end if;

  for filter_item in
    select entry.value from jsonb_array_elements(target_filters) as entry(value)
  loop
    if jsonb_typeof(filter_item) is distinct from 'object'
      or (filter_item - 'field' - 'operator' - 'values') <> '{}'::jsonb
      or jsonb_typeof(filter_item -> 'values') is distinct from 'array'
      or exists (
        select 1 from jsonb_array_elements(filter_item -> 'values') as entry(value)
        where jsonb_typeof(entry.value) is distinct from 'string'
      ) then
      raise exception 'Invalid Work Order filter';
    end if;

    filter_field := filter_item ->> 'field';
    filter_operator := filter_item ->> 'operator';
    if filter_field = any(seen_fields) then
      raise exception 'A Work Order field can only be filtered once';
    end if;
    seen_fields := array_append(seen_fields, filter_field);
    select coalesce(array_agg(entry.value), array[]::text[])
      into selected_values
    from jsonb_array_elements_text(filter_item -> 'values') as entry(value);
    if cardinality(selected_values) > 50 then
      raise exception 'A Work Order filter has too many values';
    end if;

    if filter_field = 'assigned_to' then
      if filter_operator not in ('one_of', 'none_of', 'is_empty', 'is_not_empty') then
        raise exception 'Invalid assignee filter operator';
      end if;
      if filter_operator in ('is_empty', 'is_not_empty') then
        if cardinality(selected_values) <> 0 then raise exception 'Invalid empty assignee filter'; end if;
      elsif cardinality(selected_values) = 0 or exists (
        select 1 from unnest(selected_values) as selected(value)
        where selected.value !~* '^(user|team):[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      ) then
        raise exception 'Invalid assignee filter values';
      end if;
    elsif filter_field = 'status' then
      if filter_operator not in ('one_of', 'none_of') or cardinality(selected_values) = 0
        or exists (select 1 from unnest(selected_values) as selected(value) where selected.value not in ('Open', 'On Hold', 'In Progress', 'Completed')) then
        raise exception 'Invalid status filter';
      end if;
    elsif filter_field = 'priority' then
      if filter_operator not in ('one_of', 'none_of', 'is_empty', 'is_not_empty') then
        raise exception 'Invalid priority filter operator';
      end if;
      if filter_operator in ('is_empty', 'is_not_empty') then
        if cardinality(selected_values) <> 0 then raise exception 'Invalid empty priority filter'; end if;
      elsif cardinality(selected_values) = 0
        or exists (select 1 from unnest(selected_values) as selected(value) where selected.value not in ('None', 'Urgent', 'High', 'Medium', 'Low')) then
        raise exception 'Invalid priority filter values';
      end if;
    elsif filter_field = 'work_type' then
      if filter_operator not in ('one_of', 'none_of') or cardinality(selected_values) = 0
        or exists (select 1 from unnest(selected_values) as selected(value) where selected.value not in ('reactive', 'preventive')) then
        raise exception 'Invalid Work Type filter';
      end if;
    elsif filter_field in ('due_date', 'start_date') then
      if filter_operator in ('is_empty', 'is_not_empty') then
        if cardinality(selected_values) <> 0 then raise exception 'Invalid empty date filter'; end if;
      else
        if filter_operator not in ('on', 'before', 'after', 'between') then
          raise exception 'Invalid date filter operator';
        end if;
        if cardinality(selected_values) <> (case when filter_operator = 'between' then 2 else 1 end)
          or exists (select 1 from unnest(selected_values) as selected(value) where selected.value !~ '^\d{4}-\d{2}-\d{2}$') then
          raise exception 'Invalid date filter values';
        end if;
        begin
          first_date := selected_values[1]::date;
          if to_char(first_date, 'YYYY-MM-DD') <> selected_values[1] then raise exception 'Invalid date'; end if;
          if filter_operator = 'between' then
            second_date := selected_values[2]::date;
            if to_char(second_date, 'YYYY-MM-DD') <> selected_values[2] or first_date > second_date then raise exception 'Invalid date range'; end if;
          end if;
        exception when others then
          raise exception 'Invalid date filter values';
        end;
      end if;
    else
      raise exception 'Unsupported Work Order filter field';
    end if;
  end loop;
end;
$$;

create or replace function public.work_order_matches_inbox_filters(
  target_order public.work_orders,
  target_filters jsonb
)
returns boolean
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  filter_item jsonb;
  filter_field text;
  filter_operator text;
  selected_values text[];
  has_match boolean;
  selected_date date;
begin
  for filter_item in
    select entry.value from jsonb_array_elements(coalesce(target_filters, '[]'::jsonb)) as entry(value)
  loop
    filter_field := filter_item ->> 'field';
    filter_operator := filter_item ->> 'operator';
    select coalesce(array_agg(entry.value), array[]::text[])
      into selected_values
    from jsonb_array_elements_text(filter_item -> 'values') as entry(value);

    if filter_field = 'assigned_to' then
      if filter_operator = 'is_empty' then
        select exists (
          select 1 from public.work_order_assignments assignments
          where assignments.organization_id = target_order.organization_id
            and assignments.work_order_id = target_order.id
        ) or target_order.assigned_to is not null or target_order.team_id is not null
          into has_match;
        if has_match then return false; end if;
      elsif filter_operator = 'is_not_empty' then
        select exists (
          select 1 from public.work_order_assignments assignments
          where assignments.organization_id = target_order.organization_id
            and assignments.work_order_id = target_order.id
        ) or target_order.assigned_to is not null or target_order.team_id is not null
          into has_match;
        if not has_match then return false; end if;
      else
        select exists (
          select 1
          from unnest(selected_values) as selected(value)
          where (selected.value like 'user:%' and (
              target_order.assigned_to::text = split_part(selected.value, ':', 2)
              or exists (
                select 1 from public.work_order_assignments assignments
                where assignments.organization_id = target_order.organization_id
                  and assignments.work_order_id = target_order.id
                  and assignments.user_id::text = split_part(selected.value, ':', 2)
              )
            ))
            or (selected.value like 'team:%' and (
              target_order.team_id::text = split_part(selected.value, ':', 2)
              or exists (
                select 1 from public.work_order_assignments assignments
                where assignments.organization_id = target_order.organization_id
                  and assignments.work_order_id = target_order.id
                  and assignments.team_id::text = split_part(selected.value, ':', 2)
              )
            ))
        ) into has_match;
        if (filter_operator = 'one_of' and not has_match) or (filter_operator = 'none_of' and has_match) then return false; end if;
      end if;
    elsif filter_field = 'status' then
      has_match := target_order.status = any(selected_values);
      if (filter_operator = 'one_of' and not has_match) or (filter_operator = 'none_of' and has_match) then return false; end if;
    elsif filter_field = 'priority' then
      if filter_operator = 'is_empty' and target_order.priority is not null then return false; end if;
      if filter_operator = 'is_not_empty' and target_order.priority is null then return false; end if;
      if filter_operator in ('one_of', 'none_of') then
        select exists (
          select 1
          from unnest(selected_values) as selected(value)
          where (selected.value = 'None' and target_order.priority is null)
            or (selected.value <> 'None' and target_order.priority = selected.value)
        ) into has_match;
        if (filter_operator = 'one_of' and not has_match) or (filter_operator = 'none_of' and has_match) then return false; end if;
      end if;
    elsif filter_field = 'work_type' then
      has_match := target_order.work_type = any(selected_values);
      if (filter_operator = 'one_of' and not has_match) or (filter_operator = 'none_of' and has_match) then return false; end if;
    elsif filter_field in ('due_date', 'start_date') then
      selected_date := case when filter_field = 'due_date' then target_order.due_date else target_order.start_date end;
      if filter_operator = 'is_empty' and selected_date is not null then return false; end if;
      if filter_operator = 'is_not_empty' and selected_date is null then return false; end if;
      if filter_operator not in ('is_empty', 'is_not_empty') then
        if selected_date is null then return false; end if;
        if filter_operator = 'on' and selected_date <> selected_values[1]::date then return false; end if;
        if filter_operator = 'before' and selected_date >= selected_values[1]::date then return false; end if;
        if filter_operator = 'after' and selected_date <= selected_values[1]::date then return false; end if;
        if filter_operator = 'between' and selected_date not between selected_values[1]::date and selected_values[2]::date then return false; end if;
      end if;
    else
      return false;
    end if;
  end loop;
  return true;
end;
$$;

revoke all on function public.validate_work_order_inbox_filters(jsonb) from public, anon;
grant execute on function public.validate_work_order_inbox_filters(jsonb) to authenticated;
revoke all on function public.work_order_matches_inbox_filters(public.work_orders, jsonb) from public, anon;
grant execute on function public.work_order_matches_inbox_filters(public.work_orders, jsonb) to authenticated;

notify pgrst, 'reload schema';
