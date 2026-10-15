alter function public.validate_work_order_inbox_filters(jsonb)
  rename to validate_work_order_inbox_filters_base;

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
  standard_filters jsonb := '[]'::jsonb;
  filter_count integer := 0;
begin
  if target_filters is null then
    return;
  end if;
  if jsonb_typeof(target_filters) is distinct from 'array' then
    raise exception 'Invalid Work Order filter list';
  end if;

  for filter_item in
    select entry.value from jsonb_array_elements(target_filters) as entry(value)
  loop
    filter_count := filter_count + 1;
    if filter_count > 6 then
      raise exception 'Invalid Work Order filter list';
    end if;
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
    select coalesce(array_agg(entry.value), array[]::text[])
      into selected_values
    from jsonb_array_elements_text(filter_item -> 'values') as entry(value);

    if filter_field like 'custom-%' then
      if filter_operator not in ('one_of', 'none_of', 'contains', 'not_contains', 'is_empty', 'is_not_empty') then
        raise exception 'Invalid custom field filter operator';
      end if;
      if filter_operator in ('is_empty', 'is_not_empty') then
        if cardinality(selected_values) <> 0 then raise exception 'Invalid empty custom field filter'; end if;
      elsif cardinality(selected_values) = 0 or (filter_operator in ('contains', 'not_contains') and cardinality(selected_values) <> 1) then
        raise exception 'Invalid custom field filter values';
      end if;
    else
      standard_filters := standard_filters || jsonb_build_array(filter_item);
    end if;
  end loop;

  perform public.validate_work_order_inbox_filters_base(standard_filters);
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
  organization_timezone text;
  show_todo_by_start_date_only boolean;
  filter_item jsonb;
  filter_field text;
  filter_operator text;
  selected_values text[];
  standard_filters jsonb := '[]'::jsonb;
  custom_value text;
  custom_field_exists boolean;
  custom_field_type text;
  has_match boolean;
begin
  select
    coalesce(nullif(organizations.timezone, ''), 'UTC'),
    (organizations.work_order_settings ->> 'showToDoByStartDateOnly') = 'true'
  into organization_timezone, show_todo_by_start_date_only
  from public.organizations
  where organizations.id = target_order.organization_id;

  if coalesce(show_todo_by_start_date_only, false)
    and target_order.status <> 'Completed'
    and target_order.start_date > (now() at time zone coalesce(organization_timezone, 'UTC'))::date then
    return false;
  end if;

  for filter_item in
    select entry.value from jsonb_array_elements(coalesce(target_filters, '[]'::jsonb)) as entry(value)
  loop
    filter_field := filter_item ->> 'field';
    filter_operator := filter_item ->> 'operator';
    if filter_field not like 'custom-%' then
      standard_filters := standard_filters || jsonb_build_array(filter_item);
      continue;
    end if;

    select exists (
      select 1
      from jsonb_array_elements(coalesce(organizations.work_order_settings -> 'workOrderFields' -> 'customFields', '[]'::jsonb)) as field_definition
      where field_definition ->> 'id' = filter_field
        and field_definition ->> 'type' = 'single_select'
    ), coalesce((
      select field_definition ->> 'type'
      from jsonb_array_elements(coalesce(organizations.work_order_settings -> 'workOrderFields' -> 'customFields', '[]'::jsonb)) as field_definition
      where field_definition ->> 'id' = filter_field
      limit 1
    ), '') into custom_field_exists, custom_field_type
    from public.organizations
    where organizations.id = target_order.organization_id;
    if not coalesce(custom_field_exists, false) and custom_field_type not in ('text', 'long_text', 'number', 'link', 'date', 'datetime') then
      return false;
    end if;

    custom_value := nullif(target_order.custom_field_values ->> filter_field, '');
    if filter_operator = 'is_empty' and custom_value is not null then return false; end if;
    if filter_operator = 'is_not_empty' and custom_value is null then return false; end if;
    if custom_field_type in ('text', 'long_text', 'number', 'link') and filter_operator in ('contains', 'not_contains') then
      if filter_operator = 'contains' and position(lower(selected_values[1]) in lower(coalesce(custom_value, ''))) = 0 then return false; end if;
      if filter_operator = 'not_contains' and position(lower(selected_values[1]) in lower(coalesce(custom_value, ''))) > 0 then return false; end if;
    elsif custom_field_type in ('date', 'datetime') and filter_operator in ('one_of', 'none_of') then
      select exists (
        select 1
        from jsonb_array_elements_text(filter_item -> 'values') as entry(value)
        where (
          entry.value = 'today' and left(custom_value, 10) = ((now() at time zone organization_timezone)::date)::text
        ) or (
          entry.value = 'tomorrow' and left(custom_value, 10) = (((now() at time zone organization_timezone)::date + 1))::text
        ) or (
          entry.value = 'next_7_days' and left(custom_value, 10)::date between (now() at time zone organization_timezone)::date and ((now() at time zone organization_timezone)::date + 7)
        ) or (
          entry.value = 'next_30_days' and left(custom_value, 10)::date between (now() at time zone organization_timezone)::date and ((now() at time zone organization_timezone)::date + 30)
        ) or (
          entry.value = 'this_month' and date_trunc('month', left(custom_value, 10)::date) = date_trunc('month', now() at time zone organization_timezone)
        ) or (
          entry.value = 'is_past' and left(custom_value, 10)::date < (now() at time zone organization_timezone)::date
        )
      ) into has_match;
      if (filter_operator = 'one_of' and not coalesce(has_match, false)) or (filter_operator = 'none_of' and coalesce(has_match, false)) then
        return false;
      end if;
    elsif filter_operator in ('one_of', 'none_of') then
      select coalesce(array_agg(entry.value), array[]::text[])
        into selected_values
      from jsonb_array_elements_text(filter_item -> 'values') as entry(value);
      has_match := coalesce(custom_value = any(selected_values), false);
      if (filter_operator = 'one_of' and not has_match) or (filter_operator = 'none_of' and has_match) then
        return false;
      end if;
    end if;
  end loop;

  return public.work_order_matches_inbox_filters_base(target_order, standard_filters);
end;
$$;

revoke all on function public.validate_work_order_inbox_filters_base(jsonb) from public, anon;
revoke all on function public.validate_work_order_inbox_filters(jsonb) from public, anon;
revoke all on function public.work_order_matches_inbox_filters_base(public.work_orders, jsonb) from public, anon;
revoke all on function public.work_order_matches_inbox_filters(public.work_orders, jsonb) from public, anon;
grant execute on function public.validate_work_order_inbox_filters_base(jsonb) to authenticated;
grant execute on function public.validate_work_order_inbox_filters(jsonb) to authenticated;
grant execute on function public.work_order_matches_inbox_filters_base(public.work_orders, jsonb) to authenticated;
grant execute on function public.work_order_matches_inbox_filters(public.work_orders, jsonb) to authenticated;

notify pgrst, 'reload schema';
