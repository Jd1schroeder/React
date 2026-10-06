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
  selected_value text;
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
        or exists (select 1 from unnest(selected_values) as selected(value) where selected.value not in ('Urgent', 'High', 'Medium', 'Low')) then
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
        has_match := target_order.priority = any(selected_values);
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

drop function if exists public.get_work_order_inbox_counts(uuid, text, text);
create or replace function public.get_work_order_inbox_counts(
  target_organization_id uuid,
  target_tab text,
  target_search text default null,
  target_filters jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  counts jsonb;
  normalized_search text := nullif(btrim(target_search), '');
  normalized_filters jsonb := coalesce(target_filters, '[]'::jsonb);
begin
  if auth.uid() is null then raise exception 'You must be signed in to view Work Orders' using errcode = '42501'; end if;
  if target_tab is null or target_tab not in ('To Do', 'Done') then raise exception 'Invalid Work Order Inbox tab'; end if;
  perform public.validate_work_order_inbox_filters(normalized_filters);

  with filtered as materialized (
    select work_orders.*
    from public.work_orders work_orders
    where work_orders.organization_id = target_organization_id
      and case when target_tab = 'Done' then work_orders.status = 'Completed' else work_orders.status <> 'Completed' end
      and (
        normalized_search is null
        or position(lower(normalized_search) in lower(work_orders.title)) > 0
        or position(lower(normalized_search) in work_orders.id::text) > 0
        or position(lower(normalized_search) in work_orders.work_order_number::text) > 0
      )
      and public.work_order_matches_inbox_filters(work_orders, normalized_filters)
  )
  select jsonb_build_object(
    'assigned-to-me', case when target_tab = 'Done' then 0 else (
      select count(*) from filtered work_orders
      where work_orders.assigned_to = auth.uid()
        or exists (select 1 from public.work_order_assignments assignments where assignments.work_order_id = work_orders.id and assignments.user_id = auth.uid())
    ) end,
    'assigned-to-my-teams', case when target_tab = 'Done' then 0 else (
      select count(*) from filtered work_orders
      where exists (
        select 1
        from public.work_order_assignments assignments
        join public.organization_team_members team_members on team_members.team_id = assignments.team_id and team_members.user_id = auth.uid()
        join public.organization_teams teams on teams.id = team_members.team_id and teams.organization_id = target_organization_id
        where assignments.work_order_id = work_orders.id
      ) or exists (
        select 1 from public.organization_team_members team_members
        join public.organization_teams teams on teams.id = team_members.team_id and teams.organization_id = target_organization_id
        where team_members.team_id = work_orders.team_id and team_members.user_id = auth.uid()
      )
    ) end,
    'created-by-me', case when target_tab = 'Done' then 0 else (
      select count(*) from filtered work_orders where work_orders.created_by = auth.uid()
    ) end,
    'all-open', case when target_tab = 'Done' then 0 else (select count(*) from filtered) end,
    'completed', case when target_tab = 'Done' then (select count(*) from filtered) else 0 end
  ) into counts;
  return counts;
end;
$$;

drop function if exists public.get_work_order_inbox_page(uuid, text, text, text, text, integer, integer, boolean);
create or replace function public.get_work_order_inbox_page(
  target_organization_id uuid,
  target_tab text,
  target_group text,
  target_search text,
  target_sort text,
  target_offset integer,
  target_page_size integer default 50,
  target_unread_first boolean default false,
  target_filters jsonb default '[]'::jsonb
)
returns setof public.work_orders
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  normalized_search text := nullif(btrim(target_search), '');
  normalized_filters jsonb := coalesce(target_filters, '[]'::jsonb);
  safe_offset integer := greatest(coalesce(target_offset, 0), 0);
  safe_page_size integer := least(greatest(coalesce(target_page_size, 50), 1), 50);
begin
  if auth.uid() is null then raise exception 'You must be signed in to view Work Orders' using errcode = '42501'; end if;
  if target_tab is null or target_tab not in ('To Do', 'Done') then raise exception 'Invalid Work Order Inbox tab'; end if;
  if target_group is null or target_group not in ('assigned-to-me', 'assigned-to-my-teams', 'created-by-me', 'all-open', 'completed') then raise exception 'Invalid Work Order Inbox group'; end if;
  if target_sort is null or target_sort not in ('created-oldest', 'created-newest', 'due-earliest', 'due-latest', 'updated-oldest', 'updated-newest', 'priority-highest', 'priority-lowest') then raise exception 'Invalid Work Order sort'; end if;
  perform public.validate_work_order_inbox_filters(normalized_filters);

  return query
  with filtered as materialized (
    select work_orders.*
    from public.work_orders work_orders
    where work_orders.organization_id = target_organization_id
      and case when target_tab = 'Done' then work_orders.status = 'Completed' else work_orders.status <> 'Completed' end
      and (
        normalized_search is null
        or position(lower(normalized_search) in lower(work_orders.title)) > 0
        or position(lower(normalized_search) in work_orders.id::text) > 0
        or position(lower(normalized_search) in work_orders.work_order_number::text) > 0
      )
      and case target_group
        when 'assigned-to-me' then target_tab = 'To Do' and (
          work_orders.assigned_to = auth.uid()
          or exists (select 1 from public.work_order_assignments assignments where assignments.work_order_id = work_orders.id and assignments.user_id = auth.uid())
        )
        when 'assigned-to-my-teams' then target_tab = 'To Do' and (
          exists (
            select 1
            from public.work_order_assignments assignments
            join public.organization_team_members team_members on team_members.team_id = assignments.team_id and team_members.user_id = auth.uid()
            join public.organization_teams teams on teams.id = team_members.team_id and teams.organization_id = target_organization_id
            where assignments.work_order_id = work_orders.id
          ) or exists (
            select 1 from public.organization_team_members team_members
            join public.organization_teams teams on teams.id = team_members.team_id and teams.organization_id = target_organization_id
            where team_members.team_id = work_orders.team_id and team_members.user_id = auth.uid()
          )
        )
        when 'created-by-me' then target_tab = 'To Do' and work_orders.created_by = auth.uid()
        when 'all-open' then target_tab = 'To Do'
        when 'completed' then target_tab = 'Done'
        else false
      end
      and public.work_order_matches_inbox_filters(work_orders, normalized_filters)
  )
  select filtered.*
  from filtered
  order by
    case when target_unread_first and not exists (
      select 1 from public.work_order_reads reads
      where reads.work_order_id = filtered.id and reads.user_id = auth.uid()
    ) then 0 else 1 end asc,
    case when target_sort = 'created-oldest' then filtered.created_at end asc nulls last,
    case when target_sort = 'created-newest' then filtered.created_at end desc nulls last,
    case when target_sort = 'due-earliest' then filtered.due_date end asc nulls last,
    case when target_sort = 'due-latest' then filtered.due_date end desc nulls last,
    case when target_sort = 'due-earliest' then coalesce(filtered.due_time, time '23:59:59') end asc nulls last,
    case when target_sort = 'due-latest' then coalesce(filtered.due_time, time '23:59:59') end desc nulls last,
    case when target_sort = 'updated-oldest' then filtered.updated_at end asc nulls last,
    case when target_sort = 'updated-newest' then filtered.updated_at end desc nulls last,
    case when target_sort = 'priority-highest' then case filtered.priority when 'Urgent' then 0 when 'High' then 1 when 'Medium' then 2 when 'Low' then 3 else 4 end end asc nulls last,
    case when target_sort = 'priority-lowest' then case filtered.priority when 'Low' then 0 when 'Medium' then 1 when 'High' then 2 when 'Urgent' then 3 else 4 end end asc nulls last,
    filtered.work_order_number asc
  offset safe_offset
  limit safe_page_size;
end;
$$;

drop function if exists public.mark_work_order_inbox_read(uuid, text, text);
create or replace function public.mark_work_order_inbox_read(
  target_organization_id uuid,
  target_tab text,
  target_search text default null,
  target_filters jsonb default '[]'::jsonb
)
returns integer
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_search text := nullif(btrim(target_search), '');
  normalized_filters jsonb := coalesce(target_filters, '[]'::jsonb);
  inserted_count integer;
begin
  if current_user_id is null then raise exception 'You must be signed in to review Work Orders' using errcode = '42501'; end if;
  if target_tab is null or target_tab not in ('To Do', 'Done') then raise exception 'Invalid Work Order Inbox tab'; end if;
  perform public.validate_work_order_inbox_filters(normalized_filters);

  with visible_work_orders as materialized (
    select work_orders.id
    from public.work_orders work_orders
    where work_orders.organization_id = target_organization_id
      and case when target_tab = 'Done' then work_orders.status = 'Completed' else work_orders.status <> 'Completed' end
      and (
        normalized_search is null
        or position(lower(normalized_search) in lower(work_orders.title)) > 0
        or position(lower(normalized_search) in work_orders.id::text) > 0
        or position(lower(normalized_search) in work_orders.work_order_number::text) > 0
      )
      and public.work_order_matches_inbox_filters(work_orders, normalized_filters)
      and public.has_work_order_permission(work_orders.id, 'work_orders.view')
  ), inserted_reads as (
    insert into public.work_order_reads (user_id, work_order_id)
    select current_user_id, visible_work_orders.id
    from visible_work_orders
    on conflict (user_id, work_order_id) do nothing
    returning 1
  )
  select count(*) into inserted_count from inserted_reads;
  return inserted_count;
end;
$$;

revoke execute on function public.get_work_order_inbox_counts(uuid, text, text, jsonb) from public, anon;
revoke execute on function public.get_work_order_inbox_page(uuid, text, text, text, text, integer, integer, boolean, jsonb) from public, anon;
revoke execute on function public.mark_work_order_inbox_read(uuid, text, text, jsonb) from public, anon;
grant execute on function public.get_work_order_inbox_counts(uuid, text, text, jsonb) to authenticated;
grant execute on function public.get_work_order_inbox_page(uuid, text, text, text, text, integer, integer, boolean, jsonb) to authenticated;
grant execute on function public.mark_work_order_inbox_read(uuid, text, text, jsonb) to authenticated;

notify pgrst, 'reload schema';
